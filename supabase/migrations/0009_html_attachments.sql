-- ============================================================================
-- Allow HTML attachments (static presentation exports), sandboxed on render.
--
-- HTML is a script container, which is why 0007_upload_hardening.sql left it
-- out along with SVG. It stays out of covers and of every other public
-- surface for the same reason. It is admitted here, narrowly, because
-- creators asked to upload presentation exports (reveal.js-style decks,
-- Figma/Keynote "export as HTML"), and the renderer (PortfolioGallery) shows
-- it in an iframe with `sandbox="allow-same-origin"` and no `allow-scripts` —
-- so embedded JS in the file never executes for a visitor. If that renderer
-- is ever changed to allow scripts, this bucket entry needs re-reviewing
-- alongside it.
--
-- Run after 0008_layout_and_ratios.sql. Idempotent.
-- ============================================================================

update storage.buckets
   set allowed_mime_types = array[
         'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
         'video/mp4', 'video/webm', 'video/quicktime',
         'audio/mpeg', 'audio/wav', 'audio/ogg',
         'application/pdf', 'application/zip',
         'text/html'
       ]
 where id = 'portfolios';
