'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { GitBranch, Globe, X } from 'lucide-react'

interface Profile {
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
}

const SKILL_PLACEHOLDERS = ['Design', 'Branding', 'Motion', 'UI/UX']

export function ProfileHero({ profile }: { profile: Profile }) {
  const name = profile.display_name || profile.username || 'Creator'

  return (
    <section className="relative pt-24 pb-16 px-6 overflow-hidden">
      {/* Background blur circle */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] -z-10 opacity-30"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,113,227,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
          className="relative"
        >
          <div className="w-28 h-28 rounded-full bg-secondary overflow-hidden ring-4 ring-background shadow-xl">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={name}
                width={112}
                height={112}
                className="object-cover w-full h-full"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </motion.div>

        {/* Name + Handle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground mt-1">@{profile.username}</p>
        </motion.div>

        {/* Tagline / Bio */}
        {profile.bio && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
            className="max-w-md text-foreground/75 leading-relaxed text-base"
          >
            {profile.bio}
          </motion.p>
        )}

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="flex flex-wrap justify-center gap-2"
        >
          {SKILL_PLACEHOLDERS.map((skill) => (
            <span
              key={skill}
              className="text-xs font-medium bg-secondary text-muted-foreground px-3 py-1.5 rounded-full"
            >
              {skill}
            </span>
          ))}
        </motion.div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="flex items-center gap-4"
        >
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
              title="Website"
            >
              <Globe size={16} className="text-muted-foreground" />
            </a>
          )}
          <a
            href="#"
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            title="GitHub"
          >
            <GitBranch size={16} className="text-muted-foreground" />
          </a>
          <a
            href="#"
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            title="Twitter / X"
          >
            <X size={16} className="text-muted-foreground" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
