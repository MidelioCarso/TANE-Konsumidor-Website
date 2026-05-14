/**
 * RichEditor — a Quill v2 WYSIWYG wrapper for the admin panel.
 *
 * Props:
 *   value           — controlled HTML string
 *   onChange        — (html: string) => void
 *   disabled        — greys out the editor and prevents typing
 *   compact         — slim toolbar (bold/italic/lists/link); good for modals
 *   tall            — taller editing area (suitable for long articles)
 *   minHeight       — override the editor area min-height in pixels
 *   placeholder     — placeholder text shown when the editor is empty
 *   onImageUpload   — async (file: File) => url: string
 *                     When provided the toolbar's image button uploads the
 *                     chosen file via this callback and embeds the returned
 *                     URL as an inline <img>. Without it Quill falls back to
 *                     embedding base64 data URIs (fine for demos, bad in prod).
 */
import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const TOOLBAR_FULL = [
  [{ header: [1, 2, 3, false] }],
  [{ align: [] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['link', 'blockquote', 'image'],
  ['clean'],
]

const TOOLBAR_COMPACT = [
  [{ header: [1, 2, false] }],
  [{ align: [] }],
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean'],
]

const EMPTY_HTML = '<p><br></p>'

export default function RichEditor({
  value = '',
  onChange,
  disabled = false,
  compact = false,
  tall = false,
  minHeight,
  placeholder = "Hakerek konteúdu iha ne'e...",
  onImageUpload,
}) {
  const containerRef = useRef(null)
  const quillRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onImageUploadRef = useRef(onImageUpload)
  // Tracks the last HTML string emitted via onChange to avoid feedback loops.
  const lastEmittedRef = useRef(null)

  // Keep callback refs fresh without re-running the Quill init effect.
  useEffect(() => {
    onChangeRef.current = onChange
    onImageUploadRef.current = onImageUpload
  })

  // Mount Quill once on first render.
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const editorDiv = document.createElement('div')
    container.appendChild(editorDiv)

    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder,
      readOnly: disabled,
      modules: {
        toolbar: compact ? TOOLBAR_COMPACT : TOOLBAR_FULL,
      },
    })

    quillRef.current = quill

    // Set the initial value.
    const initialValue = value || ''
    if (initialValue) {
      quill.clipboard.dangerouslyPasteHTML(initialValue)
    }
    lastEmittedRef.current = initialValue

    quill.on('text-change', () => {
      const html = quill.root.innerHTML
      const cleaned = html === EMPTY_HTML ? '' : html
      lastEmittedRef.current = cleaned
      onChangeRef.current?.(cleaned)
    })

    // Override the image toolbar button to upload instead of base64.
    const toolbar = quill.getModule('toolbar')
    if (toolbar) {
      toolbar.addHandler('image', () => {
        const uploadFn = onImageUploadRef.current
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif')
        input.click()
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) return

          const insertImageWithCaption = (url) => {
            if (!url) return
            const range = quill.getSelection(true)
            const caption = window.prompt('Caption ba imajen (optional):', '') || ''
            const captionText = caption.trim()

            quill.insertEmbed(range.index, 'image', url, 'user')
            quill.insertText(range.index + 1, '\n', 'user')

            if (captionText) {
              quill.insertText(
                range.index + 2,
                captionText,
                { color: '#8f9692', italic: true, size: 'small' },
                'user',
              )
              quill.insertText(range.index + 2 + captionText.length, '\n', 'user')
              quill.setSelection(range.index + 3 + captionText.length, 0, 'silent')
            } else {
              quill.setSelection(range.index + 2, 0, 'silent')
            }
          }

          if (uploadFn) {
            // Upload and embed the returned URL
            try {
              const url = await uploadFn(file)
              insertImageWithCaption(url)
            } catch (err) {
              console.error('RichEditor image upload failed:', err)
            }
          } else {
            // Fallback: base64 data URI (no server endpoint configured)
            const reader = new FileReader()
            reader.onload = (ev) => {
              const url = ev.target?.result
              insertImageWithCaption(url)
            }
            reader.readAsDataURL(file)
          }
        }
      })
    }

    return () => {
      quillRef.current = null
      container.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync disabled prop changes (e.g., form is submitting).
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled)
    }
  }, [disabled])

  // Sync external value changes (e.g., when API data loads into the form).
  // Only updates the editor if the incoming value differs from what was last
  // emitted — this breaks the feedback loop during user typing.
  useEffect(() => {
    if (!quillRef.current) return
    const normalized = value || ''
    if (normalized !== lastEmittedRef.current) {
      quillRef.current.clipboard.dangerouslyPasteHTML(normalized)
      lastEmittedRef.current = normalized
    }
  }, [value])

  const cls = [
    'rich-editor-wrap',
    compact && 'rich-editor-wrap--compact',
    tall && 'rich-editor-wrap--tall',
    disabled && 'rich-editor-wrap--disabled',
  ]
    .filter(Boolean)
    .join(' ')

  const style = minHeight != null ? { '--re-min-height': `${minHeight}px` } : undefined

  return <div ref={containerRef} className={cls} style={style} />
}
