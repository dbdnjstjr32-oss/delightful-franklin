// Shared column lists for portfolio-card queries. Selecting only what the cards
// render avoids pulling large body columns (e.g. description) for list views.
// Plain constants (no 'server-only') so both server pages and client components
// can import them.
export const PORTFOLIO_CARD_COLUMNS =
  'id, title, thumbnail_url, category, views, likes, profiles(username, display_name, avatar_url), portfolio_tags(tags(name))'
