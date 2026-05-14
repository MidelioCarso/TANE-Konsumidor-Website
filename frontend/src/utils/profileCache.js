const PROFILE_CACHE_KEY = 'tane_profile_payload_v1'
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000

export const readProfileContentCache = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || !parsed?.data) return null
    if (Date.now() - parsed.savedAt > PROFILE_CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export const writeProfileContentCache = (payload) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        data: payload,
      }),
    )
  } catch {
    // ignore cache write failures
  }
}
