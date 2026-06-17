import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { api } from '../../utils/api'

function DocumentScannerModule() {
  const [image, setImage] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [options, setOptions] = useState({
    deskew: true, autocrop: true, perspective: true,
    black_white: false, enhance: true,
  })
  const fileInputRef = useRef(null)

  const onDrop = useCallback((files) => {
    const file = files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return }
    setImage(file)
    setImageUrl(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, accept: { 'image/*': [] },
    noClick: true, noKeyboard: true,
  })

  const scan = async () => {
    if (!image) { toast.error('Upload an image first'); return }
    setBusy(true)
    const form = new FormData()
    form.append('file', image)
    Object.entries(options).forEach(([k, v]) => form.append(k, String(v)))
    try {
      const res = await api('/api/scan/scan', { method: 'POST', body: form })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const data = await res.json(); toast.error(data.error); return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = (image.name || 'document').replace(/\.[^.]+$/, '') + '_scanned.pdf'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Document scanned!')
    } catch { toast.error('Scan failed') }
    finally { setBusy(false) }
  }

  const toggle = (key) => setOptions(o => ({ ...o, [key]: !o[key] }))

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      <h2 className="text-2xl font-bold mb-2">Document Scanner</h2>
      <p className="text-gray-500 mb-6">Upload a photo of a document — auto-deskew, crop, enhance, and save as PDF.</p>

      <div className="max-w-2xl space-y-4">
        {/* Upload area */}
        {!imageUrl ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary-400 transition-colors cursor-pointer">
            <div className="text-5xl mb-3">📄</div>
            <p className="text-gray-500 font-medium">Drop a photo here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">Supports JPG, PNG, WebP</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              Select Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setImage(f); setImageUrl(URL.createObjectURL(f)) } }} />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <img src={imageUrl} alt="Document" className="w-full max-h-96 object-contain bg-gray-100" />
            <div className="p-3 flex gap-2 border-t">
              <button onClick={() => { setImage(null); setImageUrl(null) }}
                className="text-sm text-gray-500 hover:text-red-500">
                Remove
              </button>
            </div>
          </div>
        )}

        {isDragActive && (
          <div className="absolute inset-0 z-10 bg-primary-500/10 border-4 border-dashed border-primary-400 rounded-2xl flex items-center justify-center">
            <p className="text-primary-600 text-xl font-semibold bg-white px-6 py-3 rounded-xl shadow-lg">Drop image here</p>
          </div>
        )}

        {/* Options */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Processing Options</h3>
          {[
            { key: 'deskew', label: 'Auto Deskew', desc: 'Straighten tilted documents' },
            { key: 'perspective', label: 'Perspective Correction', desc: 'Flatten angled photos (recommended)' },
            { key: 'autocrop', label: 'Auto Crop', desc: 'Remove borders' },
            { key: 'enhance', label: 'Enhance', desc: 'Increase contrast and sharpness' },
            { key: 'black_white', label: 'Black & White', desc: 'Convert to monochrome' },
          ].map(opt => (
            <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={options[opt.key]}
                onChange={() => toggle(opt.key)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <button onClick={scan} disabled={!image || busy}
          className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? (
            <>⏳ Scanning...</>
          ) : (
            <>📄 Scan & Download PDF</>
          )}
        </button>
      </div>
    </div>
  )
}

export default {
  id: 'document-scanner',
  name: 'Document Scanner',
  icon: 'box',
  component: DocumentScannerModule,
  order: 9,
}
