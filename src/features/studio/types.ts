export type StudioWork = {
  id: string
  title: string
  thumbnail_url: string | null
  category: string | null
  views: number
  likes: number
  status: 'draft' | 'published'
  created_at: string
  updated_at: string | null
  /** Attachments beyond the cover — shown as a badge so a creator can tell at a
   *  glance which pieces still need their files. */
  assetCount: number
  tags: string[]
}

export type SortKey = 'newest' | 'oldest' | 'views' | 'likes' | 'title'
export type StatusFilter = 'all' | 'published' | 'draft'
