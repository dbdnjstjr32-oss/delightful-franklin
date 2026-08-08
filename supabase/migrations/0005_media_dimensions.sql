-- ============================================================================
-- Cover-image dimensions.
--
-- The browsing grids are masonry: each card has to reserve its final height
-- before the image loads, or the whole column reflows on every load and the
-- layout shifts under the reader. Storing the uploaded image's intrinsic size
-- lets the card render an exact aspect-ratio box on the server.
--
-- Nullable on purpose: rows created before this migration have no dimensions,
-- and the card falls back to 4:3 for those. Run after 0004_portfolio_crud.sql.
-- Idempotent.
-- ============================================================================

alter table public.portfolios
  add column if not exists thumbnail_width int,
  add column if not exists thumbnail_height int;

-- Guard against nonsense values (0 would make the aspect ratio divide by zero,
-- and anything beyond 30k px is not a real image).
alter table public.portfolios
  drop constraint if exists portfolios_thumbnail_dimensions_positive;
alter table public.portfolios
  add constraint portfolios_thumbnail_dimensions_positive
  check (
    (thumbnail_width is null or (thumbnail_width > 0 and thumbnail_width <= 30000))
    and (thumbnail_height is null or (thumbnail_height > 0 and thumbnail_height <= 30000))
  );

comment on column public.portfolios.thumbnail_width is
  'Intrinsic width in px of thumbnail_url, measured at upload. Null = unknown (card falls back to 4:3).';
comment on column public.portfolios.thumbnail_height is
  'Intrinsic height in px of thumbnail_url, measured at upload. Null = unknown (card falls back to 4:3).';
