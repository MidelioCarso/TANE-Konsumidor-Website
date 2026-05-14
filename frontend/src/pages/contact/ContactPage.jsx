import { useEffect, useMemo, useState } from 'react'

const initialForm = {
  full_name: '',
  phone: '',
  residence: '',
  problem_description: '',
  entity_name: '',
  assistance_request: '',
  evidence_photo: null,
  website: '',
  middle_name: '',
  js_enabled: '0',
}

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
const OPTIMIZED_TARGET_BYTES = 1.2 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1600
const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const PHONE_REGEX = /^[0-9+\-\s]{7,30}$/

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return '0 KB'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

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
      reject(new Error('Labele lee imajen atu halo otimizasaun.'))
    }
    img.src = objectUrl
  })

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })

async function optimizeImageForUpload(file) {
  if (!file || !ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return { file, optimized: false }
  }

  const image = await loadImageElement(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    return { file, optimized: false }
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

  let outputType = file.type === 'image/png' ? 'image/png' : 'image/webp'
  let quality = 0.86
  let blob = await canvasToBlob(canvas, outputType, quality)

  if (!blob && outputType === 'image/webp') {
    outputType = 'image/jpeg'
    blob = await canvasToBlob(canvas, outputType, quality)
  }

  if (!blob) {
    return { file, optimized: false }
  }

  while (blob.size > OPTIMIZED_TARGET_BYTES && quality > 0.58) {
    quality -= 0.08
    const nextBlob = await canvasToBlob(canvas, outputType, quality)
    if (!nextBlob) break
    blob = nextBlob
  }

  // Keep original file if optimization is not beneficial.
  if (blob.size >= file.size) {
    return { file, optimized: false }
  }

  const baseName = (file.name || 'upload').replace(/\.[^/.]+$/, '')
  const extension = outputType === 'image/webp' ? 'webp' : outputType === 'image/jpeg' ? 'jpg' : 'png'
  const optimizedFile = new File([blob], `${baseName}-optimized.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  })

  return { file: optimizedFile, optimized: true, originalSize: file.size, optimizedSize: blob.size }
}

function ContactPage() {
  const [formData, setFormData] = useState(initialForm)
  const [status, setStatus] = useState({ loading: false, message: '', error: false })
  const [fieldErrors, setFieldErrors] = useState({})
  const [uploadInfo, setUploadInfo] = useState('')
  const [processingImage, setProcessingImage] = useState(false)
  const [startedAt, setStartedAt] = useState(() => Date.now())

  useEffect(() => {
    setFormData((prev) => ({ ...prev, js_enabled: '1' }))
  }, [])

  const counts = useMemo(
    () => ({
      problem_description: formData.problem_description.trim().length,
      assistance_request: formData.assistance_request.trim().length,
    }),
    [formData.problem_description, formData.assistance_request]
  )

  const validateForm = () => {
    const errors = {}

    if (formData.full_name.trim().length < 3) {
      errors.full_name = 'Naran presiza iha pelumenus letra 3.'
    }
    if (!PHONE_REGEX.test(formData.phone.trim())) {
      errors.phone = 'Numeru telefone invalidu. Uza deit numeru no simbolu + -.'
    }
    if (formData.residence.trim().length < 2) {
      errors.residence = 'Hela fatin la bele mamuk.'
    }
    if (counts.problem_description < 20) {
      errors.problem_description = 'Problema presiza pelumenus karakter 20.'
    }
    if (formData.entity_name.trim().length < 2) {
      errors.entity_name = 'Favor hatama entidade neebe relevante.'
    }
    if (counts.assistance_request < 10) {
      errors.assistance_request = 'Pedidu ajuda presiza pelumenus karakter 10.'
    }

    if (formData.evidence_photo) {
      if (formData.evidence_photo.size > MAX_UPLOAD_SIZE_BYTES) {
        errors.evidence_photo = 'Foto boot liu 5MB.'
      }
      if (!ALLOWED_UPLOAD_TYPES.includes(formData.evidence_photo.type)) {
        errors.evidence_photo = 'Formatu foto tenke JPG, PNG, ka WEBP.'
      }
    }

    return errors
  }

  const onChange = async (event) => {
    const { name, value, type, files } = event.target
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })

    if (name === 'evidence_photo' && type === 'file') {
      const selectedFile = files && files[0] ? files[0] : null
      if (!selectedFile) {
        setUploadInfo('')
        setFormData((prev) => ({ ...prev, evidence_photo: null }))
        return
      }

      setProcessingImage(true)
      try {
        const optimized = await optimizeImageForUpload(selectedFile)
        setFormData((prev) => ({ ...prev, evidence_photo: optimized.file }))

        if (optimized.optimized) {
          setUploadInfo(
            `Foto otimiza: ${formatBytes(optimized.originalSize)} -> ${formatBytes(optimized.optimizedSize)}`
          )
        } else {
          setUploadInfo(`Tamanho foto: ${formatBytes(selectedFile.size)}`)
        }
      } catch {
        setFormData((prev) => ({ ...prev, evidence_photo: selectedFile }))
        setUploadInfo(`Tamanho foto: ${formatBytes(selectedFile.size)}`)
      } finally {
        setProcessingImage(false)
      }
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? (files && files[0] ? files[0] : null) : value,
    }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setStatus({ loading: false, message: 'Favor korrije kampu sira antes submete.', error: true })
      return
    }

    if (status.loading || processingImage) {
      return
    }

    setStatus({ loading: true, message: '', error: false })

    try {
      const payload = new FormData()
      payload.append('full_name', formData.full_name)
      payload.append('phone', formData.phone)
      payload.append('residence', formData.residence)
      payload.append('problem_description', formData.problem_description)
      payload.append('entity_name', formData.entity_name)
      payload.append('assistance_request', formData.assistance_request)
      payload.append('website', formData.website)
      payload.append('middle_name', formData.middle_name)
      payload.append('js_enabled', formData.js_enabled)
      payload.append('started_at', String(startedAt))

      if (formData.evidence_photo) {
        payload.append('evidence_photo', formData.evidence_photo)
      }

      const response = await fetch('/api/contacts/complaints/', {
        method: 'POST',
        body: payload,
      })

      const responsePayload = await response.json()

      if (!response.ok) {
        throw new Error(responsePayload.detail || 'Falha atu submete keixa.')
      }

      setStatus({ loading: false, message: responsePayload.detail, error: false })
      setFormData(initialForm)
      setFieldErrors({})
      setUploadInfo('')
      setStartedAt(Date.now())
    } catch (submitError) {
      setStatus({ loading: false, message: submitError.message, error: true })
    }
  }

  return (
    <section className="content-section keixa-section">
      <div className="container">
        <div className="page-intro keixa-page-intro">
          <span className="keixa-kicker">Atendimentu Konsumidor</span>
          <h1>Submete Keixa</h1>
          <p>
            Formuláriu ida ne'e públiku ba konsumidór atu hato'o problema no husu apoiu husi TANE.
            Favor prenxe ho detalhu loos atu ekipa bele responde lalais no efisiente.
          </p>
        </div>

        <div className="form-card keixa-form-card">
          <div className="keixa-form-head">
            <h2>Formuláriu Keixa</h2>
            <p>Kampu ho informasaun klaru sei ajuda prosesu verifikasaun no atendimentu.</p>
          </div>

          <form className="contact-form contact-form--keixa" onSubmit={onSubmit}>
            <label className="contact-field">
              <span className="contact-field-title">1. Naran Kompletu</span>
              <input name="full_name" maxLength={120} value={formData.full_name} onChange={onChange} autoComplete="name" required />
              {fieldErrors.full_name ? <span className="contact-form-error">{fieldErrors.full_name}</span> : null}
            </label>

            <label className="contact-field">
              <span className="contact-field-title">2. Numeru Telefone</span>
              <input name="phone" maxLength={30} value={formData.phone} onChange={onChange} inputMode="tel" autoComplete="tel" required />
              {fieldErrors.phone ? <span className="contact-form-error">{fieldErrors.phone}</span> : null}
            </label>

            <label className="contact-field">
              <span className="contact-field-title">3. Hela Fatin</span>
              <input name="residence" maxLength={200} value={formData.residence} onChange={onChange} autoComplete="street-address" required />
              {fieldErrors.residence ? <span className="contact-form-error">{fieldErrors.residence}</span> : null}
            </label>

            <label className="contact-field contact-field--wide">
              <span className="contact-field-title">4. Problema Saida mak Ita Hasoru</span>
              <textarea
                name="problem_description"
                rows="4"
                maxLength={2500}
                value={formData.problem_description}
                onChange={onChange}
                required
              />
              <span className="contact-form-help">Karakter: {counts.problem_description}/2500</span>
              {fieldErrors.problem_description ? <span className="contact-form-error">{fieldErrors.problem_description}</span> : null}
            </label>

            <label className="contact-field">
              <span className="contact-field-title">5. Ho Entidade (Loja ka Supermerkadu) ida ne'ebe?</span>
              <input name="entity_name" maxLength={180} value={formData.entity_name} onChange={onChange} required />
              {fieldErrors.entity_name ? <span className="contact-form-error">{fieldErrors.entity_name}</span> : null}
            </label>

            <label className="contact-field contact-field--wide">
              <span className="contact-field-title">6. Pedidu saida mak ita husu atu TANE fo ajuda?</span>
              <textarea
                name="assistance_request"
                rows="4"
                maxLength={2500}
                value={formData.assistance_request}
                onChange={onChange}
                required
              />
              <span className="contact-form-help">Karakter: {counts.assistance_request}/2500</span>
              {fieldErrors.assistance_request ? <span className="contact-form-error">{fieldErrors.assistance_request}</span> : null}
            </label>

            <label className="contact-field contact-field--wide">
              <span className="contact-field-title">7. Fotografia evidensia karik iha (Optional)</span>
              <input
                type="file"
                name="evidence_photo"
                accept="image/png,image/jpeg,image/webp"
                aria-describedby="evidence-help"
                onChange={onChange}
              />
              <span className="contact-form-help" id="evidence-help">
                Formatu suportadu: JPG, PNG, WEBP (optional)
              </span>
              {formData.evidence_photo ? (
                <span className="contact-form-help">File: {formData.evidence_photo.name}</span>
              ) : null}
              {processingImage ? <span className="contact-form-help">Halo otimizasaun foto...</span> : null}
              {uploadInfo ? <span className="contact-form-help">{uploadInfo}</span> : null}
              {fieldErrors.evidence_photo ? <span className="contact-form-error">{fieldErrors.evidence_photo}</span> : null}
            </label>

            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={onChange}
              autoComplete="off"
              tabIndex="-1"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
            />

            <input
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={onChange}
              autoComplete="off"
              tabIndex="-1"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
            />

            <input type="hidden" name="js_enabled" value={formData.js_enabled} readOnly />

            <div className="contact-form-actions">
              <p className="contact-form-note">Informasaun ne'e sei uza deit ba atendimentu keixa no labele publika ba ema seluk.</p>
              <button type="submit" disabled={status.loading}>
                {status.loading ? 'Submete...' : processingImage ? 'Prepara foto...' : 'Submete Keixa'}
              </button>
            </div>
          </form>
        </div>

        {status.message ? (
          <p className={status.error ? 'form-status form-status-error' : 'form-status'}>{status.message}</p>
        ) : null}
      </div>
    </section>
  )
}

export default ContactPage
