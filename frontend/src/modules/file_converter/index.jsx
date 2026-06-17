import { useState, useEffect, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { api } from '../../utils/api'

function FileConverterModule() {
  const [categories, setCategories] = useState([])
  const [file, setFile] = useState(null)
  const [category, setCategory] = useState(null)
  const [targetFormat, setTargetFormat] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    api('/api/convert/formats').then(res => {
      if (res.success) setCategories(res.data.categories)
    }).catch(() => {})
  }, [])

  const onDrop = useCallback((files) => {
    const f = files[0]
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    setFile(f)

    const matched = categories.find(c =>
      c.from.includes(ext) || (c.id === 'image_convert' && ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext))
    )
    if (matched) {
      setCategory(matched.id)
      setTargetFormat(matched.to[0] || '')
    } else {
      setCategory(null)
      setTargetFormat('')
    }
  }, [categories])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, noClick: true, noKeyboard: true,
  })

  const ext = file?.name?.split('.').pop()?.toLowerCase() || ''

  const convert = async () => {
    if (!file || !category) { toast.error('Upload a file and select conversion'); return }
    setBusy(true)
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    form.append('target_format', targetFormat)
    try {
      const res = await api('/api/convert/', { method: 'POST', body: form })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const data = await res.json(); toast.error(data.error); return
      }
      const ext2 = targetFormat || 'pdf'
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '.' + ext2; a.click()
      URL.revokeObjectURL(url)
      toast.success('Converted!')
    } catch { toast.error('Conversion failed') }
    finally { setBusy(false) }
  }

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      <h2 className="text-2xl font-bold mb-2">File Converter</h2>
      <p className="text-gray-500 mb-6">Convert files between formats — images, PDFs, documents, and more.</p>

      <div className="max-w-2xl space-y-4">
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary-400 transition-colors cursor-pointer">
            <div className="text-5xl mb-3">📄</div>
            <p className="text-gray-500 font-medium">Drop a file here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">Supports images, PDFs, Word docs, presentations, CSVs</p>
            <button onClick={() => inputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              Select File
            </button>
            <input ref={inputRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onDrop([f]) }} />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📎</span>
              <div>
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={() => { setFile(null); setCategory(null) }}
              className="text-sm text-gray-400 hover:text-red-500">Remove</button>
          </div>
        )}

        {isDragActive && (
          <div className="absolute inset-0 z-10 bg-primary-500/10 border-4 border-dashed border-primary-400 rounded-2xl flex items-center justify-center">
            <p className="text-primary-600 text-xl font-semibold bg-white px-6 py-3 rounded-xl shadow-lg">Drop file here</p>
          </div>
        )}

        {file && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Convert to</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.filter(c => c.from.includes(ext)).map(c => (
                <label key={c.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${category === c.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="cat" checked={category === c.id}
                    onChange={() => { setCategory(c.id); setTargetFormat(c.to[0] || '') }}
                    className="text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{c.label}</p>
                    <p className="text-xs text-gray-400">{ext.toUpperCase()} → {c.to.join(', ').toUpperCase()}</p>
                  </div>
                </label>
              ))}
              {!categories.some(c => c.from.includes(ext)) && (
                <p className="text-sm text-gray-400 col-span-2 py-2">No conversions available for this file type</p>
              )}
            </div>

            {category === 'image_convert' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Target format</label>
                <select value={targetFormat} onChange={e => setTargetFormat(e.target.value)}
                  className="rounded-lg border-gray-300 text-sm">
                  {categories.find(c => c.id === 'image_convert')?.to.map(f => (
                    <option key={f} value={f}>{f.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={convert} disabled={busy || !category}
              className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {busy ? 'Converting...' : '🔄 Convert & Download'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  id: 'file-converter',
  name: 'File Converter',
  icon: 'box',
  component: FileConverterModule,
  order: 10,
}
