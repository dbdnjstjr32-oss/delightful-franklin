// Portfolio categories — shared by the explore filters, the upload/edit form,
// and server-side validation. Plain module so client and server can import it.
export const CATEGORIES = [
  { key: 'development', label: 'Development' },
  { key: 'design', label: 'Design' },
  { key: '3d', label: '3D' },
  { key: 'video', label: 'Video' },
  { key: 'photography', label: 'Photography' },
  { key: 'writing', label: 'Writing' },
  { key: 'music', label: 'Music' },
] as const

export const CATEGORY_KEYS: readonly string[] = CATEGORIES.map((c) => c.key)
