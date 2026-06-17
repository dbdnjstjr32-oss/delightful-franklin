'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Image from 'next/image'
import { updateOnboardingProfile } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, UserCircle } from 'lucide-react'

export function OnboardingForm({ defaultName, defaultUsername }: { defaultName: string, defaultUsername: string | null }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke the previous object URL whenever the preview changes or the
  // component unmounts, so blob URLs don't leak.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateOnboardingProfile(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg border-border/50 mt-10">
      <CardHeader className="space-y-2 text-center pb-6 pt-8">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold">✦</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Complete your profile</CardTitle>
        <CardDescription className="text-muted-foreground px-4">
          Tell us a bit about yourself. You can always change this later.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-8 pb-8">
        <form action={handleSubmit} className="space-y-6">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div 
              className="w-24 h-24 rounded-full bg-secondary overflow-hidden border-2 border-border flex items-center justify-center relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Avatar preview"
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <UserCircle size={40} className="text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={20} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              name="avatar" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">Click to upload avatar</p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="username" className="text-sm font-medium">Username (Required)</Label>
            <Input 
              id="username" 
              name="username" 
              defaultValue={defaultUsername || ''}
              placeholder="e.g. wonseok" 
              required
              pattern="^[a-zA-Z0-9_]{3,20}$"
              title="3-20 characters long, letters, numbers, and underscores only"
              aria-invalid={!!error}
              aria-describedby={error ? 'onboarding-error' : undefined}
              className="h-11 px-4 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
            <Input 
              id="displayName" 
              name="displayName" 
              defaultValue={defaultName}
              placeholder="e.g. 원석" 
              aria-invalid={!!error}
              aria-describedby={error ? 'onboarding-error' : undefined}
              className="h-11 px-4 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="bio" className="text-sm font-medium">Bio (One-line description)</Label>
            <Textarea 
              id="bio" 
              name="bio" 
              placeholder="e.g. 3D Artist & Motion Designer based in Seoul" 
              className="resize-none h-20 px-4 py-3 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="website" className="text-sm font-medium">SNS / Website Link</Label>
            <Input 
              id="website" 
              name="website" 
              type="url"
              placeholder="https://instagram.com/..." 
              aria-invalid={!!error}
              aria-describedby={error ? 'onboarding-error' : undefined}
              className="h-11 px-4 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          {error && (
            <div id="onboarding-error" role="alert" className="p-3 text-sm text-destructive-foreground bg-destructive/10 rounded-lg text-center border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl font-semibold text-base mt-4" 
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Finish & Go to Dashboard'}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
