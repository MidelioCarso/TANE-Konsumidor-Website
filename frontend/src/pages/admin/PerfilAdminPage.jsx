import { useEffect, useMemo, useRef, useState } from 'react'
import { Save, Building2, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react'
import RichEditor from '../../components/admin/RichEditor'
import { resolveMediaSrc } from '../../utils/media'
import { optimizeImageForUpload } from '../../utils/imageOptimization'
import useUnsavedForm from '../../hooks/useUnsavedForm'
import AdminUnsavedNotice from '../../components/admin/AdminUnsavedNotice'
import { getAssetPath } from '../../utils/assetPaths'

const EMPTY = {
  organization_name: '',
  about_intro: '',
  about_image_url: '',
  mision_image_url: '',
  vision_image_url: '',
  valor_image_url: '',
  home_hero_image_url: '',
  perfil_hero_image_url: '',
  historia_hero_image_url: '',
  planu_hero_image_url: '',
  publication_hero_image_url: '',
  mision: '',
  vision: '',
  valor: '',
  facebook_url: '',
  tiktok_url: '',
  contact_email: '',
  whatsapp_number: '',
  map_embed_url: '',
  map_location_label: '',
}

const FALLBACK_SECTION_IMAGE =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80'

export default function PerfilAdminPage() {
  const [form, setForm] = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [misionImageFile, setMisionImageFile] = useState(null)
  const [visionImageFile, setVisionImageFile] = useState(null)
  const [valorImageFile, setValorImageFile] = useState(null)
  const [misionImagePreview, setMisionImagePreview] = useState('')
  const [visionImagePreview, setVisionImagePreview] = useState('')
  const [valorImagePreview, setValorImagePreview] = useState('')
  const [homeHeroFile, setHomeHeroFile] = useState(null)
  // hero image files
  const [perfilHeroFile, setPerfilHeroFile] = useState(null)
  const [historiaHeroFile, setHistoriaHeroFile] = useState(null)
  const [planuHeroFile, setPlanuHeroFile] = useState(null)
  const [publicationHeroFile, setPublicationHeroFile] = useState(null)
  const [homeHeroPreview, setHomeHeroPreview] = useState('')
  const [perfilHeroPreview, setPerfilHeroPreview] = useState('')
  const [historiaHeroPreview, setHistoriaHeroPreview] = useState('')
  const [planuHeroPreview, setPlanuHeroPreview] = useState('')
  const [publicationHeroPreview, setPublicationHeroPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const imageInputRef = useRef(null)
  const misionImageRef = useRef(null)
  const visionImageRef = useRef(null)
  const valorImageRef = useRef(null)
  const homeHeroRef = useRef(null)
  const perfilHeroRef = useRef(null)
  const historiaHeroRef = useRef(null)
  const planuHeroRef = useRef(null)
  const publicationHeroRef = useRef(null)

  const dirtySnapshot = useMemo(
    () => ({
      ...form,
      about_image_file_changed: Boolean(imageFile),
      mision_image_file_changed: Boolean(misionImageFile),
      vision_image_file_changed: Boolean(visionImageFile),
      valor_image_file_changed: Boolean(valorImageFile),
      home_hero_file_changed: Boolean(homeHeroFile),
      perfil_hero_file_changed: Boolean(perfilHeroFile),
      historia_hero_file_changed: Boolean(historiaHeroFile),
      planu_hero_file_changed: Boolean(planuHeroFile),
      publication_hero_file_changed: Boolean(publicationHeroFile),
    }),
    [form, imageFile, misionImageFile, visionImageFile, valorImageFile, homeHeroFile, perfilHeroFile, historiaHeroFile, planuHeroFile, publicationHeroFile],
  )

  const { isDirty, isFieldDirty, resetBaseline } = useUnsavedForm(dirtySnapshot, !loading)

  useEffect(() => {
    fetch('/api/admin/profile/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setForm(d.profile)
          setImagePreview(resolveMediaSrc(d.profile.about_image_url || ''))
          setMisionImagePreview(resolveMediaSrc(d.profile.mision_image_url || ''))
          setVisionImagePreview(resolveMediaSrc(d.profile.vision_image_url || ''))
          setValorImagePreview(resolveMediaSrc(d.profile.valor_image_url || ''))
          setHomeHeroPreview(resolveMediaSrc(d.profile.home_hero_image_url || ''))
          setPerfilHeroPreview(resolveMediaSrc(d.profile.perfil_hero_image_url || ''))
          setHistoriaHeroPreview(resolveMediaSrc(d.profile.historia_hero_image_url || ''))
          setPlanuHeroPreview(resolveMediaSrc(d.profile.planu_hero_image_url || ''))
          setPublicationHeroPreview(resolveMediaSrc(d.profile.publication_hero_image_url || ''))
          resetBaseline({
            ...d.profile,
            about_image_file_changed: false,
            mision_image_file_changed: false,
            vision_image_file_changed: false,
            valor_image_file_changed: false,
            home_hero_file_changed: false,
            perfil_hero_file_changed: false,
            historia_hero_file_changed: false,
            planu_hero_file_changed: false,
            publication_hero_file_changed: false,
          })
        }
      })
      .catch(() => setError('Falha karga perfil.'))
      .finally(() => setLoading(false))
  }, [resetBaseline])

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (error) setError('')
  }

  const handleImageFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(resolveMediaSrc(form.about_image_url || ''))
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Favor hili imajen ida deit.')
      event.target.value = ''
      return
    }
    const optimized = await optimizeImageForUpload(file, {
      maxDimension: 1800,
      targetBytes: 1.4 * 1024 * 1024,
      preferredType: 'image/webp',
    })
    const finalFile = optimized.file || file

    setImageFile(finalFile)
    setImagePreview(URL.createObjectURL(finalFile))
    if (error) setError('')
  }

  const makeHeroFileHandler =
    (setFile, setPreview) =>
    async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError('Favor hili imajen ida deit.')
        event.target.value = ''
        return
      }
      const optimized = await optimizeImageForUpload(file, {
        maxDimension: 2000,
        targetBytes: 1.6 * 1024 * 1024,
        preferredType: 'image/webp',
      })
      const finalFile = optimized.file || file

      setFile(finalFile)
      setPreview(URL.createObjectURL(finalFile))
      if (error) setError('')
    }

  const handleSectionImageFileChange =
    (setFile, setPreview, urlKey) =>
    async (event) => {
      const file = event.target.files?.[0]
      if (!file) {
        setFile(null)
        setPreview(resolveMediaSrc(form[urlKey] || ''))
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Favor hili imajen ida deit.')
        event.target.value = ''
        return
      }
      const optimized = await optimizeImageForUpload(file, {
        maxDimension: 1800,
        targetBytes: 1.4 * 1024 * 1024,
        preferredType: 'image/webp',
      })
      const finalFile = optimized.file || file

      setFile(finalFile)
      setPreview(URL.createObjectURL(finalFile))
      if (error) setError('')
    }

  const resetHeroImage = (field, setFile, setPreview, inputRef) => {
    setFile(null)
    set(field, '')
    setPreview('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.mision.trim()) { setError('Misaun obrigatóriu.'); return }
    setSaving(true); setError('')
    try {
      const hasFile = Boolean(
        imageFile
        || misionImageFile
        || visionImageFile
        || valorImageFile
        || homeHeroFile
        || perfilHeroFile
        || historiaHeroFile
        || planuHeroFile
        || publicationHeroFile
      )
      let r
      if (hasFile) {
        const body = new FormData()
        body.append('organization_name', form.organization_name || '')
        body.append('about_intro', form.about_intro || '')
        body.append('about_image_url', form.about_image_url || '')
        body.append('mision_image_url', form.mision_image_url || '')
        body.append('vision_image_url', form.vision_image_url || '')
        body.append('valor_image_url', form.valor_image_url || '')
        body.append('home_hero_image_url', form.home_hero_image_url || '')
        body.append('perfil_hero_image_url', form.perfil_hero_image_url || '')
        body.append('historia_hero_image_url', form.historia_hero_image_url || '')
        body.append('planu_hero_image_url', form.planu_hero_image_url || '')
        body.append('publication_hero_image_url', form.publication_hero_image_url || '')
        if (imageFile) body.append('about_image_file', imageFile)
        if (misionImageFile) body.append('mision_image_file', misionImageFile)
        if (visionImageFile) body.append('vision_image_file', visionImageFile)
        if (valorImageFile) body.append('valor_image_file', valorImageFile)
        if (homeHeroFile) body.append('home_hero_image_file', homeHeroFile)
        if (perfilHeroFile) body.append('perfil_hero_image_file', perfilHeroFile)
        if (historiaHeroFile) body.append('historia_hero_image_file', historiaHeroFile)
        if (planuHeroFile) body.append('planu_hero_image_file', planuHeroFile)
        if (publicationHeroFile) body.append('publication_hero_image_file', publicationHeroFile)
        body.append('mision', form.mision || '')
        body.append('vision', form.vision || '')
        body.append('valor', form.valor || '')
        body.append('facebook_url', form.facebook_url || '')
        body.append('tiktok_url', form.tiktok_url || '')
        body.append('contact_email', form.contact_email || '')
        body.append('whatsapp_number', form.whatsapp_number || '')
        body.append('map_embed_url', form.map_embed_url || '')
        body.append('map_location_label', form.map_location_label || '')
        r = await fetch('/api/admin/profile/', {
          method: 'POST',
          credentials: 'same-origin',
          body,
        })
      } else {
        r = await fetch('/api/admin/profile/', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save la susesu.')
      setForm(d.profile)
      setImageFile(null)
      setMisionImageFile(null)
      setVisionImageFile(null)
      setValorImageFile(null)
      setHomeHeroFile(null)
      setPerfilHeroFile(null)
      setHistoriaHeroFile(null)
      setPlanuHeroFile(null)
      setPublicationHeroFile(null)
      setImagePreview(resolveMediaSrc(d.profile.about_image_url || ''))
      setMisionImagePreview(resolveMediaSrc(d.profile.mision_image_url || ''))
      setVisionImagePreview(resolveMediaSrc(d.profile.vision_image_url || ''))
      setValorImagePreview(resolveMediaSrc(d.profile.valor_image_url || ''))
      setHomeHeroPreview(resolveMediaSrc(d.profile.home_hero_image_url || ''))
      setPerfilHeroPreview(resolveMediaSrc(d.profile.perfil_hero_image_url || ''))
      setHistoriaHeroPreview(resolveMediaSrc(d.profile.historia_hero_image_url || ''))
      setPlanuHeroPreview(resolveMediaSrc(d.profile.planu_hero_image_url || ''))
      setPublicationHeroPreview(resolveMediaSrc(d.profile.publication_hero_image_url || ''))
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (misionImageRef.current) misionImageRef.current.value = ''
      if (visionImageRef.current) visionImageRef.current.value = ''
      if (valorImageRef.current) valorImageRef.current.value = ''
      if (homeHeroRef.current) homeHeroRef.current.value = ''
      if (perfilHeroRef.current) perfilHeroRef.current.value = ''
      if (historiaHeroRef.current) historiaHeroRef.current.value = ''
      if (planuHeroRef.current) planuHeroRef.current.value = ''
      if (publicationHeroRef.current) publicationHeroRef.current.value = ''
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      resetBaseline({
        ...d.profile,
        about_image_file_changed: false,
        mision_image_file_changed: false,
        vision_image_file_changed: false,
        valor_image_file_changed: false,
        home_hero_file_changed: false,
        perfil_hero_file_changed: false,
        historia_hero_file_changed: false,
        planu_hero_file_changed: false,
        publication_hero_file_changed: false,
      })
      setSuccess('Perfil atualiza ho susesu!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span><span className="sep">/</span>
          <span className="current">Perfil Organizasaun</span>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Perfil Organizasaun</h1>
            <p className="adm-page-subtitle">Atualiza misaun, vizaun no valor TANE nian.</p>
          </div>
        </div>

        {error && <div className="adm-alert adm-alert--error"><AlertCircle size={16} />{error}</div>}
        {success && <div className="adm-alert adm-alert--success"><CheckCircle size={16} />{success}</div>}
        <AdminUnsavedNotice show={isDirty} />

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="adm-spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={`adm-form-section${isDirty ? ' adm-form-section--dirty' : ''}`}>
              <div className="adm-form-section-title"><Building2 size={16} />Informasaun Báziku</div>
              <div className="adm-form-group">
                <label>Naran Organizasaun</label>
                <input className={`adm-input${isFieldDirty('organization_name') ? ' adm-input--dirty' : ''}`} value={form.organization_name} onChange={(e) => set('organization_name', e.target.value)} disabled={saving} placeholder="TANE Konsumidor" />
              </div>
              <div className="adm-form-group">
                <label>Introdusaun Jerál (Sobre TANE)</label>
                <div className={isFieldDirty('about_intro') ? 'adm-rich-dirty-wrap' : ''}>
                  <RichEditor
                    value={form.about_intro}
                    onChange={(html) => set('about_intro', html)}
                    disabled={saving}
                    placeholder="Hakerek introdusaun jerál kona-ba TANE..."
                  />
                </div>
                <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 6, display: 'block' }}>
                  Konteúdu ne'e sei sai iha seção introdusaun iha pájina Perfil.
                </small>
              </div>
              <div className="adm-form-group">
                <label>Imajen Seção Introduksaun</label>
                <input
                  ref={imageInputRef}
                  className={`adm-input${isFieldDirty('about_image_file_changed') ? ' adm-input--dirty' : ''}`}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={saving}
                />
                <input
                  className={`adm-input${isFieldDirty('about_image_url') ? ' adm-input--dirty' : ''}`}
                  style={{ marginTop: 8 }}
                  value={form.about_image_url || ''}
                  onChange={(e) => set('about_image_url', e.target.value)}
                  disabled={saving}
                  placeholder="ka hatama URL imajen (opsionál)"
                />
                <div className="adm-thumb-preview" style={{ marginTop: 10 }}>
                  <img src={imagePreview || resolveMediaSrc(form.about_image_url) || FALLBACK_SECTION_IMAGE} alt="Intro section preview" />
                </div>
              </div>
              <div className="adm-form-group">
                <label>Hero Image — Pájina Inísiu/Home</label>
                <div className="adm-hero-upload-group">
                  <div className="adm-hero-upload-row">
                    <input
                      ref={homeHeroRef}
                      className={`adm-input${isFieldDirty('home_hero_file_changed') ? ' adm-input--dirty' : ''}`}
                      type="file"
                      accept="image/*"
                      onChange={makeHeroFileHandler(setHomeHeroFile, setHomeHeroPreview)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="adm-hero-reset-btn"
                      onClick={() => resetHeroImage('home_hero_image_url', setHomeHeroFile, setHomeHeroPreview, homeHeroRef)}
                      disabled={saving}
                      title="Reset ba imajen padraun"
                    >
                      <RotateCcw size={13} />Reset
                    </button>
                  </div>
                  <div className="adm-hero-preview">
                    {homeHeroPreview ? (
                      <img src={homeHeroPreview} alt="Home hero preview" />
                    ) : (
                      <div className="adm-hero-preview-empty">
                        <img src={getAssetPath('logo.png')} alt="TANE" />
                        <span>Imajen padraun sei uza</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* ── Perfil Hero ── */}
              <div className="adm-form-group">
                <label>Hero Image — Pájina Perfil</label>
                <div className="adm-hero-upload-group">
                  <div className="adm-hero-upload-row">
                    <input
                      ref={perfilHeroRef}
                      className={`adm-input${isFieldDirty('perfil_hero_file_changed') ? ' adm-input--dirty' : ''}`}
                      type="file"
                      accept="image/*"
                      onChange={makeHeroFileHandler(setPerfilHeroFile, setPerfilHeroPreview)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="adm-hero-reset-btn"
                      onClick={() => resetHeroImage('perfil_hero_image_url', setPerfilHeroFile, setPerfilHeroPreview, perfilHeroRef)}
                      disabled={saving}
                      title="Reset ba imajen padraun"
                    >
                      <RotateCcw size={13} />Reset
                    </button>
                  </div>
                  <div className="adm-hero-preview">
                    {perfilHeroPreview ? (
                      <img src={perfilHeroPreview} alt="Perfil hero preview" />
                    ) : (
                      <div className="adm-hero-preview-empty">
                        <img src={getAssetPath('logo.png')} alt="TANE" />
                        <span>Imajen padraun sei uza</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Historia Hero ── */}
              <div className="adm-form-group">
                <label>Hero Image — Pájina Istória</label>
                <div className="adm-hero-upload-group">
                  <div className="adm-hero-upload-row">
                    <input
                      ref={historiaHeroRef}
                      className={`adm-input${isFieldDirty('historia_hero_file_changed') ? ' adm-input--dirty' : ''}`}
                      type="file"
                      accept="image/*"
                      onChange={makeHeroFileHandler(setHistoriaHeroFile, setHistoriaHeroPreview)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="adm-hero-reset-btn"
                      onClick={() => resetHeroImage('historia_hero_image_url', setHistoriaHeroFile, setHistoriaHeroPreview, historiaHeroRef)}
                      disabled={saving}
                      title="Reset ba imajen padraun"
                    >
                      <RotateCcw size={13} />Reset
                    </button>
                  </div>
                  <div className="adm-hero-preview">
                    {historiaHeroPreview ? (
                      <img src={historiaHeroPreview} alt="Historia hero preview" />
                    ) : (
                      <div className="adm-hero-preview-empty">
                        <img src={getAssetPath('logo.png')} alt="TANE" />
                        <span>Imajen padraun sei uza</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Planu Hero ── */}
              <div className="adm-form-group">
                <label>Hero Image — Pájina Planu</label>
                <div className="adm-hero-upload-group">
                  <div className="adm-hero-upload-row">
                    <input
                      ref={planuHeroRef}
                      className={`adm-input${isFieldDirty('planu_hero_file_changed') ? ' adm-input--dirty' : ''}`}
                      type="file"
                      accept="image/*"
                      onChange={makeHeroFileHandler(setPlanuHeroFile, setPlanuHeroPreview)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="adm-hero-reset-btn"
                      onClick={() => resetHeroImage('planu_hero_image_url', setPlanuHeroFile, setPlanuHeroPreview, planuHeroRef)}
                      disabled={saving}
                      title="Reset ba imajen padraun"
                    >
                      <RotateCcw size={13} />Reset
                    </button>
                  </div>
                  <div className="adm-hero-preview">
                    {planuHeroPreview ? (
                      <img src={planuHeroPreview} alt="Planu hero preview" />
                    ) : (
                      <div className="adm-hero-preview-empty">
                        <img src={getAssetPath('logo.png')} alt="TANE" />
                        <span>Imajen padraun sei uza</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Publications Hero ── */}
              <div className="adm-form-group">
                <label>Hero Image — Pájina Publikasaun</label>
                <div className="adm-hero-upload-group">
                  <div className="adm-hero-upload-row">
                    <input
                      ref={publicationHeroRef}
                      className={`adm-input${isFieldDirty('publication_hero_file_changed') ? ' adm-input--dirty' : ''}`}
                      type="file"
                      accept="image/*"
                      onChange={makeHeroFileHandler(setPublicationHeroFile, setPublicationHeroPreview)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="adm-hero-reset-btn"
                      onClick={() => resetHeroImage('publication_hero_image_url', setPublicationHeroFile, setPublicationHeroPreview, publicationHeroRef)}
                      disabled={saving}
                      title="Reset ba imajen padraun"
                    >
                      <RotateCcw size={13} />Reset
                    </button>
                  </div>
                  <div className="adm-hero-preview">
                    {publicationHeroPreview ? (
                      <img src={publicationHeroPreview} alt="Publication hero preview" />
                    ) : (
                      <div className="adm-hero-preview-empty">
                        <img src={getAssetPath('logo.png')} alt="TANE" />
                        <span>Imajen padraun sei uza</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="adm-form-section">
              <div className="adm-form-section-title">Misaun, Vizaun no Valor</div>
              <div className="adm-form-group">
                <label>Misaun *</label>
                <input
                  ref={misionImageRef}
                  className={`adm-input${isFieldDirty('mision_image_file_changed') ? ' adm-input--dirty' : ''}`}
                  type="file"
                  accept="image/*"
                  onChange={handleSectionImageFileChange(setMisionImageFile, setMisionImagePreview, 'mision_image_url')}
                  disabled={saving}
                />
                <input
                  className={`adm-input${isFieldDirty('mision_image_url') ? ' adm-input--dirty' : ''}`}
                  style={{ marginTop: 8 }}
                  value={form.mision_image_url || ''}
                  onChange={(e) => set('mision_image_url', e.target.value)}
                  disabled={saving}
                  placeholder="ka hatama URL imajen ba misaun (opsionál)"
                />
                <div className="adm-thumb-preview" style={{ marginTop: 10, marginBottom: 10 }}>
                  <img src={misionImagePreview || resolveMediaSrc(form.mision_image_url) || FALLBACK_SECTION_IMAGE} alt="Misaun section preview" />
                </div>
                <div className={isFieldDirty('mision') ? 'adm-rich-dirty-wrap' : ''}>
                  <RichEditor
                    value={form.mision}
                    onChange={(html) => set('mision', html)}
                    disabled={saving}
                    placeholder="Hakerek misaun TANE nian..."
                  />
                </div>
              </div>
              <div className="adm-form-group">
                <label>Vizaun</label>
                <input
                  ref={visionImageRef}
                  className={`adm-input${isFieldDirty('vision_image_file_changed') ? ' adm-input--dirty' : ''}`}
                  type="file"
                  accept="image/*"
                  onChange={handleSectionImageFileChange(setVisionImageFile, setVisionImagePreview, 'vision_image_url')}
                  disabled={saving}
                />
                <input
                  className={`adm-input${isFieldDirty('vision_image_url') ? ' adm-input--dirty' : ''}`}
                  style={{ marginTop: 8 }}
                  value={form.vision_image_url || ''}
                  onChange={(e) => set('vision_image_url', e.target.value)}
                  disabled={saving}
                  placeholder="ka hatama URL imajen ba vizaun (opsionál)"
                />
                <div className="adm-thumb-preview" style={{ marginTop: 10, marginBottom: 10 }}>
                  <img src={visionImagePreview || resolveMediaSrc(form.vision_image_url) || FALLBACK_SECTION_IMAGE} alt="Vizaun section preview" />
                </div>
                <div className={isFieldDirty('vision') ? 'adm-rich-dirty-wrap' : ''}>
                  <RichEditor
                    value={form.vision}
                    onChange={(html) => set('vision', html)}
                    disabled={saving}
                    placeholder="Hakerek vizaun TANE nian..."
                  />
                </div>
              </div>
              <div className="adm-form-group">
                <label>Valor</label>
                <input
                  ref={valorImageRef}
                  className={`adm-input${isFieldDirty('valor_image_file_changed') ? ' adm-input--dirty' : ''}`}
                  type="file"
                  accept="image/*"
                  onChange={handleSectionImageFileChange(setValorImageFile, setValorImagePreview, 'valor_image_url')}
                  disabled={saving}
                />
                <input
                  className={`adm-input${isFieldDirty('valor_image_url') ? ' adm-input--dirty' : ''}`}
                  style={{ marginTop: 8 }}
                  value={form.valor_image_url || ''}
                  onChange={(e) => set('valor_image_url', e.target.value)}
                  disabled={saving}
                  placeholder="ka hatama URL imajen ba valor (opsionál)"
                />
                <div className="adm-thumb-preview" style={{ marginTop: 10, marginBottom: 10 }}>
                  <img src={valorImagePreview || resolveMediaSrc(form.valor_image_url) || FALLBACK_SECTION_IMAGE} alt="Valor section preview" />
                </div>
                <div className={isFieldDirty('valor') ? 'adm-rich-dirty-wrap' : ''}>
                  <RichEditor
                    value={form.valor}
                    onChange={(html) => set('valor', html)}
                    disabled={saving}
                    placeholder="Hakerek valor TANE nian..."
                  />
                </div>
              </div>
            </div>

            <div className="adm-form-section">
              <div className="adm-form-section-title">Footer no Kontaktu Online</div>
              <div className="adm-form-group">
                <label>Facebook Link</label>
                <input
                  className={`adm-input${isFieldDirty('facebook_url') ? ' adm-input--dirty' : ''}`}
                  value={form.facebook_url || ''}
                  onChange={(e) => set('facebook_url', e.target.value)}
                  disabled={saving}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="adm-form-group">
                <label>TikTok Link</label>
                <input
                  className={`adm-input${isFieldDirty('tiktok_url') ? ' adm-input--dirty' : ''}`}
                  value={form.tiktok_url || ''}
                  onChange={(e) => set('tiktok_url', e.target.value)}
                  disabled={saving}
                  placeholder="https://tiktok.com/@..."
                />
              </div>
              <div className="adm-form-group">
                <label>Email Kontaktu</label>
                <input
                  className={`adm-input${isFieldDirty('contact_email') ? ' adm-input--dirty' : ''}`}
                  type="email"
                  value={form.contact_email || ''}
                  onChange={(e) => set('contact_email', e.target.value)}
                  disabled={saving}
                  placeholder="contact@tane.tl"
                />
              </div>
              <div className="adm-form-group">
                <label>WhatsApp Number</label>
                <input
                  className={`adm-input${isFieldDirty('whatsapp_number') ? ' adm-input--dirty' : ''}`}
                  value={form.whatsapp_number || ''}
                  onChange={(e) => set('whatsapp_number', e.target.value)}
                  disabled={saving}
                  placeholder="+6707xxxxxxx"
                />
                <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 6, display: 'block' }}>
                  Sei uza atu halo link direto ba WhatsApp iha footer.
                </small>
              </div>
              <div className="adm-form-group">
                <label>Mapa Embed URL</label>
                <input
                  className={`adm-input${isFieldDirty('map_embed_url') ? ' adm-input--dirty' : ''}`}
                  value={form.map_embed_url || ''}
                  onChange={(e) => set('map_embed_url', e.target.value)}
                  disabled={saving}
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </div>
              <div className="adm-form-group">
                <label>Mapa Lokalizasaun Label</label>
                <input
                  className={`adm-input${isFieldDirty('map_location_label') ? ' adm-input--dirty' : ''}`}
                  value={form.map_location_label || ''}
                  onChange={(e) => set('map_location_label', e.target.value)}
                  disabled={saving}
                  placeholder="Ex: Dili, Timor-Leste"
                />
              </div>
            </div>

            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                {saving
                  ? <><span className="adm-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Save...</>
                  : <><Save size={15} />Save Perfil</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
