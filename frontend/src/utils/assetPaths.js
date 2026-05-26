export function getAssetPath(filename) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    return `/${filename}`
  }

  if (typeof window !== 'undefined' && window.__VITE_DEV__) {
    return `/${filename}`
  }

  const staticBase = typeof window !== 'undefined' && window.__STATIC_BASE__
    ? window.__STATIC_BASE__
    : '/static/'

  return `${staticBase}${filename}`
}