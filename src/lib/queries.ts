// Shared column lists for portfolio-card queries. Selecting only what the cards
// render avoids pulling large body columns (e.g. description) for list views.
// Plain constants (no 'server-only') so both server pages and client components
// can import them.
// thumbnail_width/height let the masonry cards reserve their exact height before
// the image loads (see 0005_media_dimensions.sql).
export const PORTFOLIO_CARD_COLUMNS =
  'id, title, thumbnail_url, thumbnail_width, thumbnail_height, category, views, likes, profiles(username, display_name, avatar_url), portfolio_tags(tags(name))'

/** Every public list filters on this. RLS already hides other people's drafts
 *  (0006_creator_studio.sql), but a signed-in creator can still see their own,
 *  and a half-finished piece appearing in the explore feed for its author alone
 *  is confusing. Applying it in the query keeps the feeds identical for
 *  everyone. */
export const PUBLISHED = 'published'
