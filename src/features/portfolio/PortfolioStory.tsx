'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface Portfolio {
  id: string
  title: string
  description: string | null
  // These fields will be stored as JSONB or text columns — for MVP we use description
  // Future: separate columns for introduction, process, challenges, gallery_urls, result
  thumbnail_url: string | null
  project_url: string | null
  category: string | null
}

interface Props {
  portfolio: Portfolio
}

const sectionReveal = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

function StorySection({
  label,
  title,
  children,
  accent = false,
}: {
  label: string
  title: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={sectionReveal}
      className={`py-20 px-6 ${accent ? 'bg-secondary/30' : ''}`}
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">{label}</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">{title}</h2>
        <div className="prose prose-neutral max-w-none text-foreground/80 leading-relaxed text-base md:text-lg">
          {children}
        </div>
      </div>
    </motion.section>
  )
}

export function PortfolioStory({ portfolio }: Props) {
  // For MVP: use description as introduction placeholder.
  // Future DB columns: introduction, process, challenges, result, gallery_urls[]
  const intro = portfolio.description || 'No introduction provided.'

  return (
    <div className="border-t border-border/50">
      {/* Section 2 — Introduction */}
      <StorySection label="Section 01" title="Project Introduction">
        <p>{intro}</p>
      </StorySection>

      {/* Section 3 — Process */}
      <StorySection label="Section 02" title="Process" accent>
        <div className="grid md:grid-cols-3 gap-8">
          {['Research & Planning', 'Design & Iteration', 'Build & Refine'].map((step, i) => (
            <div key={step} className="space-y-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 className="font-semibold text-foreground">{step}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This section describes the {step.toLowerCase()} phase of the project. Detailed process notes can be added by the creator.
              </p>
            </div>
          ))}
        </div>
      </StorySection>

      {/* Section 4 — Challenges */}
      <StorySection label="Section 03" title="Challenges & Solutions">
        <div className="space-y-8">
          {[
            { q: '어떤 문제를 해결했나요?', a: 'Describe the core problem this project addresses.' },
            { q: '왜 만들었나요?', a: 'Explain the motivation and goals behind this project.' },
            { q: '어떤 시행착오가 있었나요?', a: 'Share the iterations, failures, and lessons learned.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-l-2 border-primary/30 pl-6">
              <h3 className="font-semibold text-foreground mb-2">{q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </StorySection>

      {/* Section 5 — Gallery */}
      <StorySection label="Section 04" title="Gallery" accent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl bg-muted/60 flex items-center justify-center border border-border/50"
            >
              <span className="text-xs text-muted-foreground/50">Image {i + 1}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/60 mt-4 text-center">
          갤러리 이미지는 포트폴리오 업로드 시 추가할 수 있습니다.
        </p>
      </StorySection>

      {/* Section 6 — Final Result */}
      <StorySection label="Section 05" title="Final Result">
        <div className="aspect-[16/9] rounded-2xl bg-secondary overflow-hidden relative">
          {portfolio.thumbnail_url ? (
            <Image
              src={portfolio.thumbnail_url}
              alt="Final result"
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground/40 text-sm">최종 결과물 이미지</span>
            </div>
          )}
        </div>
        {portfolio.project_url && (
          <div className="mt-8 text-center">
            <a
              href={portfolio.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-full font-semibold text-sm hover:opacity-80 transition-opacity"
            >
              View Live Project →
            </a>
          </div>
        )}
      </StorySection>
    </div>
  )
}
