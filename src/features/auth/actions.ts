'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { routing } from '@/i18n/routing'
import { logger } from '@/lib/logger'

const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5MB
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

/** Best-effort locale detection from the Referer header, defaulting to the app default. */
async function localeFromReferer(): Promise<string> {
  const referer = (await headers()).get('referer') || ''
  const match = referer.match(
    new RegExp(`/(${routing.locales.join('|')})(/|$)`)
  )
  return match ? match[1] : routing.defaultLocale
}

async function originFromHeaders(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  )
}

export async function loginWithCredentials(formData: FormData) {
  const supabase = await createClient()
  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  if (!identifier || !password) {
    return { error: 'Username/Email and Password are required.' }
  }

  let email = identifier
  // If it doesn't look like an email, assume it's a username and resolve it.
  // The lookup runs through the service-role client so the RPC stays revoked
  // for anonymous callers (prevents bulk username -> email harvesting).
  if (!identifier.includes('@')) {
    let resolved: string | null = null
    try {
      const admin = createAdminClient()
      const { data } = await admin.rpc('get_email_by_username', { p_username: identifier })
      resolved = (data as string | null) ?? null
    } catch (e) {
      logger.warn('username login unavailable; set SUPABASE_SERVICE_ROLE_KEY', {
        error: e instanceof Error ? e.message : String(e),
      })
    }
    if (!resolved) {
      return { error: 'Invalid username or password.' }
    }
    email = resolved
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  // Fallback: If trigger didn't create profile, create it now
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.from('profiles').insert({
        id: authData.user.id,
      })
    }
  }

  // Successful login, redirect to dashboard
  const locale = await localeFromReferer()
  redirect(`/${locale}/dashboard`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const locale = await localeFromReferer()
  redirect(`/${locale}/login`)
}

export async function loginWithGoogle() {
  const supabase = await createClient()

  const origin = await originFromHeaders()
  const locale = await localeFromReferer()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // The callback route lives at /[locale]/auth/callback — the locale
      // segment is required or the handler won't match.
      redirectTo: `${origin}/${locale}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    return { url: data.url }
  }

  return { error: 'Could not start Google sign-in. Please try again.' }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get('username') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const displayName = formData.get('displayName') as string

  if (!username || !email || !password || !displayName) {
    return { error: 'All fields are required.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  if (!USERNAME_RE.test(username)) {
    return { error: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.' }
  }

  // Optimistic uniqueness check (the DB UNIQUE constraint is the real guard).
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) {
    return { error: 'Username is already taken.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName,
      },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  // Only persist the username when the user is actually signed in. When email
  // confirmation is enabled there is no session yet, so this runs after they
  // confirm + complete onboarding instead (RLS would block it here anyway).
  if (authData.user && authData.session) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username, display_name: displayName })
      .eq('id', authData.user.id)

    if (profileError) {
      // 23505 = unique_violation: someone claimed the username between the
      // check above and now.
      if (profileError.code === '23505') {
        return { error: 'Username is already taken.' }
      }
      return { error: 'Could not save your profile. Please try again.' }
    }
  }

  const locale = await localeFromReferer()
  // No session means email confirmation is required — send the user to login
  // with a notice instead of bouncing them through the protected onboarding route.
  if (authData.user && !authData.session) {
    redirect(`/${locale}/login?notice=confirm-email`)
  }
  redirect(`/${locale}/onboarding`)
}

export async function updateOnboardingProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const username = formData.get('username') as string
  const bio = formData.get('bio') as string
  const website = formData.get('website') as string
  const avatarFile = formData.get('avatar') as File | null

  if (!username) {
    return { error: 'Username is required' }
  }

  if (!USERNAME_RE.test(username)) {
    return { error: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.' }
  }

  // Check if username is already taken by someone else
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (existingUser) {
    return { error: 'Username is already taken.' }
  }

  let avatar_url: string | undefined = undefined

  if (avatarFile && avatarFile.size > 0) {
    // 1. Validate max size
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: 'Avatar must be 5MB or smaller.' }
    }

    // 2. Validate MIME type string
    if (!ALLOWED_AVATAR_TYPES.includes(avatarFile.type)) {
      return { error: 'Avatar must be a PNG, JPEG, or WebP image.' }
    }

    // 3. Magic-number validation
    const buffer = await avatarFile.arrayBuffer()
    const arr = new Uint8Array(buffer).subarray(0, 4)
    const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

    let isValidMagic = false
    let detectedExt = ''
    if (header.startsWith('FFD8FF')) { 
      isValidMagic = true; detectedExt = 'jpg' 
    } else if (header === '89504E47') { 
      isValidMagic = true; detectedExt = 'png' 
    } else if (header === '52494646') { 
      const webpBuffer = new Uint8Array(buffer).subarray(8, 12)
      const webpHeader = Array.from(webpBuffer).map(b => String.fromCharCode(b)).join('')
      if (webpHeader === 'WEBP') { isValidMagic = true; detectedExt = 'webp' }
    }

    if (!isValidMagic) {
      return { error: 'Invalid image format detected (magic number mismatch).' }
    }

    // Ensure extension matches MIME type roughly
    const ext = (avatarFile.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
    if (ext !== detectedExt) {
      return { error: 'MIME type does not match file content.' }
    }

    // 4. UUID filename generation
    const fileName = `${user.id}/${crypto.randomUUID()}.${detectedExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, { contentType: avatarFile.type, upsert: false })

    if (uploadError) {
      return { error: 'Error uploading avatar: ' + uploadError.message }
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
    avatar_url = publicUrlData.publicUrl
  }

  const updateData: Record<string, string> = { username, bio, website }
  if (avatar_url) updateData.avatar_url = avatar_url

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Username is already taken.' }
    }
    return { error: error.message }
  }

  const locale = await localeFromReferer()
  redirect(`/${locale}/dashboard`)
}
