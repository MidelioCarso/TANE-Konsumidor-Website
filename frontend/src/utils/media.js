/**
 * resolveMediaSrc — normalise a media/image URL for use in <img> src or CSS.
 *
 * In development Vite's dev-server proxy already forwards every `/media/...`
 * request to the Django backend (http://127.0.0.1:8000), so relative paths
 * work the same way they do in production.  The old per-file dev hacks that
 * prefixed `http://127.0.0.1:8000` based on `window.location.port === '5173'`
 * are no longer needed and have been removed from each page.
 *
 * All this function does now is guard against falsy values so callers don't
 * need to repeat `|| ''` everywhere.
 */
export const resolveMediaSrc = (src) => {
  if (!src) return ''
  return src
}
