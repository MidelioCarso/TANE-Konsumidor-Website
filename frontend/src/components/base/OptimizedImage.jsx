import { useState } from 'react'

export default function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  sizes,
  onLoad,
  onError,
  ...rest
}) {
  const [currentSrc, setCurrentSrc] = useState(src || '')

  const handleError = (event) => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
    }
    if (onError) onError(event)
  }

  return (
    <img
      src={currentSrc || fallbackSrc || ''}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority || (loading === 'eager' ? 'high' : 'low')}
      sizes={sizes}
      onLoad={onLoad}
      onError={handleError}
      {...rest}
    />
  )
}
