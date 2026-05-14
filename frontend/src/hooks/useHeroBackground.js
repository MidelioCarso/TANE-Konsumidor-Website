import { useEffect, useMemo, useState } from 'react'

export default function useHeroBackground(imageUrl) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!imageUrl) {
      setIsReady(false)
      return
    }

    let active = true

    const img = new Image()
    img.decoding = 'async'
    img.fetchPriority = 'auto'

    const markReady = () => {
      if (!active) return
      setIsReady(true)
    }

    img.onload = markReady
    img.onerror = markReady
    img.src = imageUrl

    if (img.complete) {
      markReady()
      return () => {
        active = false
      }
    }

    return () => {
      active = false
    }
  }, [imageUrl])

  const heroStyle = useMemo(() => {
    if (!imageUrl) return undefined
    return { '--hero-image': `url(${imageUrl})` }
  }, [imageUrl])

  return { heroStyle, heroReady: isReady }
}
