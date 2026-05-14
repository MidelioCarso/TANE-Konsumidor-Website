const DEFAULT_MAX_DIMENSION = 1920
const DEFAULT_TARGET_BYTES = 1.5 * 1024 * 1024

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to decode image file.'))
    }
    img.src = objectUrl
  })

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })

export async function optimizeImageForUpload(
  file,
  {
    maxDimension = DEFAULT_MAX_DIMENSION,
    targetBytes = DEFAULT_TARGET_BYTES,
    preferredType = 'image/webp',
  } = {},
) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    return { file, optimized: false }
  }

  // Keep GIF files untouched to avoid breaking animation frames.
  if (file.type === 'image/gif') {
    return { file, optimized: false }
  }

  const image = await loadImageElement(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    return { file, optimized: false }
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const supportedTypes = ['image/webp', 'image/jpeg', 'image/png']
  let outputType = supportedTypes.includes(preferredType) ? preferredType : 'image/webp'
  let quality = 0.86

  let blob = await canvasToBlob(canvas, outputType, quality)
  if (!blob && outputType !== 'image/jpeg') {
    outputType = 'image/jpeg'
    blob = await canvasToBlob(canvas, outputType, quality)
  }

  if (!blob) {
    return { file, optimized: false }
  }

  while (blob.size > targetBytes && quality > 0.58) {
    quality -= 0.08
    const nextBlob = await canvasToBlob(canvas, outputType, quality)
    if (!nextBlob) break
    blob = nextBlob
  }

  if (blob.size >= file.size) {
    return { file, optimized: false }
  }

  const baseName = (file.name || 'upload').replace(/\.[^/.]+$/, '')
  const extension = outputType === 'image/webp' ? 'webp' : outputType === 'image/jpeg' ? 'jpg' : 'png'
  const optimizedFile = new File([blob], `${baseName}-optimized.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  })

  return {
    file: optimizedFile,
    optimized: true,
    originalSize: file.size,
    optimizedSize: blob.size,
  }
}
