import { useEffect, useMemo, useState } from 'react'
import { Facebook, Mail, MapPin, MessageCircle, Music2 } from 'lucide-react'

const FALLBACK_FOOTER = {
  organization_name: 'TANE Konsumidor',
  facebook_url: '',
  tiktok_url: '',
  contact_email: '',
  whatsapp_number: '',
  map_embed_url: '',
  map_location_label: '',
}

const normalizeHttpUrl = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  return `https://${text}`
}

const extractMapSrc = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (raw.includes('<iframe')) {
    const srcMatch = raw.match(/src=["']([^"']+)["']/i)
    return srcMatch?.[1] ? srcMatch[1].trim() : ''
  }

  return raw
}

const isSafeEmbedUrl = (value = '') => {
  const url = normalizeHttpUrl(extractMapSrc(value))
  if (!url) return false
  return url.startsWith('https://') || url.startsWith('http://')
}

const toWhatsAppHref = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits.replace(/\+/g, '')}`
}

function Footer() {
  const [footerData, setFooterData] = useState(FALLBACK_FOOTER)
  const year = new Date().getFullYear()

  useEffect(() => {
    fetch('/api/content/footer/')
      .then((r) => {
        if (!r.ok) throw new Error('Footer load failed')
        return r.json()
      })
      .then((payload) => {
        if (payload.footer) {
          setFooterData({ ...FALLBACK_FOOTER, ...payload.footer })
        }
      })
      .catch(() => {})
  }, [])

  const socialLinks = useMemo(() => {
    const items = []

    const facebookUrl = normalizeHttpUrl(footerData.facebook_url)
    if (facebookUrl) {
      items.push({
        key: 'facebook',
        label: 'Facebook',
        href: facebookUrl,
        Icon: Facebook,
      })
    }

    const tiktokUrl = normalizeHttpUrl(footerData.tiktok_url)
    if (tiktokUrl) {
      items.push({
        key: 'tiktok',
        label: 'TikTok',
        href: tiktokUrl,
        Icon: Music2,
      })
    }

    const email = String(footerData.contact_email || '').trim()
    if (email) {
      items.push({
        key: 'email',
        label: email,
        href: `mailto:${email}`,
        Icon: Mail,
      })
    }

    const whatsappHref = toWhatsAppHref(footerData.whatsapp_number)
    if (whatsappHref) {
      items.push({
        key: 'whatsapp',
        label: `WhatsApp ${footerData.whatsapp_number}`,
        href: whatsappHref,
        Icon: MessageCircle,
      })
    }

    return items
  }, [footerData])

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div>
            <h3>{footerData.organization_name || 'TANE Konsumidor'}</h3>
            <p>Aproksima no Liga TANE Konsumidor Timor-Leste</p>
          </div>

          {socialLinks.length ? (
            <div className="footer-socials" aria-label="Social media links">
              {socialLinks.map(({ key, label, href, Icon }) => (
                <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="footer-social-link">
                  <Icon size={16} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {isSafeEmbedUrl(footerData.map_embed_url) ? (
          <div className="footer-map-wrap">
            <div className="footer-map-head">
              <MapPin size={16} />
              <span>{footerData.map_location_label || 'Lokalizasaun TANE'}</span>
            </div>
            <div className="footer-map-frame">
              <iframe
                src={normalizeHttpUrl(extractMapSrc(footerData.map_embed_url))}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                title="TANE map localization"
              />
            </div>
          </div>
        ) : null}

        <div className="footer-bottom">
          <p>© {year} {footerData.organization_name || 'TANE Konsumidor'} • Timor-Leste</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer