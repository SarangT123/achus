import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

const toolIcons = {
  merge: { icon: '📑', color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Merge' },
  split: { icon: '✂️', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Split' },
  compress: { icon: '📦', color: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Compress' },
  convert: { icon: '🔄', color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Convert' },
  rotate: { icon: '🔄', color: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Rotate' },
  extract: { icon: '📋', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Extract' },
  watermark: { icon: '💧', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Watermark' },
  'page-numbers': { icon: '🔢', color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Page Numbers' },
  reorder: { icon: '🔀', color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Reorder' },
  ocr: { icon: '🔍', color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'OCR' },
  encrypt: { icon: '🔒', color: 'bg-red-100 text-red-700 border-red-200', label: 'Encrypt' },
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function ToolLayout({ toolId, title, description, onBack, children }) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1">
        ← Back to tools
      </button>
      <h3 className="text-xl font-bold mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-5">{description}</p>
      {children}
    </div>
  )
}

function FileUpload({ onFile, accept, multiple, label }) {
  const onDrop = (files) => { if (files.length > 0) onFile(multiple ? files : files[0]) }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, multiple, maxFiles: multiple ? 10 : 1 })
  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-200 bg-white'}`}>
      <input {...getInputProps()} />
      <div className="text-3xl mb-2">{isDragActive ? '📥' : '📄'}</div>
      <p className="text-sm text-gray-600">{label || (multiple ? 'Drag PDFs here or click to browse' : 'Drag a PDF here or click to browse')}</p>
    </div>
  )
}

function downloadBlob(res, filename) {
  const blob = new Blob([res])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function MergeTool({ onBack }) {
  const [files, setFiles] = useState([]); const [busy, setBusy] = useState(false)
  const doMerge = async () => {
    if (files.length < 2) { toast.error('Select at least 2 PDFs'); return }
    setBusy(true)
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    try {
      const res = await fetch('/api/pdf-tools/merge', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Merge failed'); return }
      const blob = await res.blob()
      downloadBlob(blob, 'merged.pdf')
      toast.success('Merged successfully!')
    } catch { toast.error('Merge failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="merge" title="Merge PDFs" description="Combine multiple PDFs into one file.">
      <FileUpload onFile={setFiles} accept={{ 'application/pdf': ['.pdf'] }} multiple label="Drag PDFs here to merge them" />
      {files.length > 0 && <p className="text-sm text-gray-500 mb-3">{files.length} file(s) selected</p>}
      <button onClick={doMerge} disabled={busy || files.length < 2} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Merging...' : `Merge ${files.length} PDF${files.length !== 1 ? 's' : ''}`}
      </button>
    </ToolLayout>
  )
}

function SplitTool({ onBack }) {
  const [file, setFile] = useState(null); const [ranges, setRanges] = useState('1-2'); const [busy, setBusy] = useState(false)
  const doSplit = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('ranges', ranges)
    try {
      const res = await fetch('/api/pdf-tools/split', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Split failed'); return }
      downloadBlob(await res.blob(), 'split.pdf')
      toast.success('Split successful!')
    } catch { toast.error('Split failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="split" title="Split PDF" description="Extract specific pages by range (e.g. 1-3, 5, 7-9).">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      {file && <p className="text-sm text-gray-500 mb-3">{file.name} ({formatBytes(file.size)})</p>}
      <input value={ranges} onChange={e => setRanges(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm mb-3" placeholder="e.g. 1-3, 5, 7-9" />
      <button onClick={doSplit} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Splitting...' : 'Split PDF'}
      </button>
    </ToolLayout>
  )
}

function CompressTool({ onBack }) {
  const [file, setFile] = useState(null); const [quality, setQuality] = useState(60); const [busy, setBusy] = useState(false)
  const doCompress = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('quality', quality)
    try {
      const res = await fetch('/api/pdf-tools/compress', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Compression failed'); return }
      downloadBlob(await res.blob(), 'compressed.pdf')
      toast.success('Compressed!')
    } catch { toast.error('Compression failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="compress" title="Compress PDF" description="Reduce file size by adjusting image quality.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700">Quality: {quality}%</label>
        <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400"><span>Smaller</span><span>Better quality</span></div>
      </div>
      <button onClick={doCompress} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Compressing...' : 'Compress PDF'}
      </button>
    </ToolLayout>
  )
}

function ConvertTool({ onBack }) {
  const [file, setFile] = useState(null); const [targetFormat, setTargetFormat] = useState('docx'); const [busy, setBusy] = useState(false)
  const conversions = [
    { value: 'docx', label: 'PDF → Word (DOCX)' },
    { value: 'txt', label: 'PDF → Text' },
    { value: 'png', label: 'PDF → Images (PNG)' },
    { value: 'jpg', label: 'PDF → Images (JPG)' },
  ]
  const doConvert = async () => {
    if (!file) { toast.error('Upload a file'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('target_format', targetFormat)
    try {
      const res = await fetch('/api/pdf-tools/convert', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Conversion failed'); return }
      const blob = await res.blob()
      const ext = targetFormat === 'jpg' ? 'jpg' : targetFormat
      const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
      downloadBlob(blob, name)
      toast.success('Converted!')
    } catch { toast.error('Conversion failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="convert" title="Convert" description="Convert between PDF, Word, images, and more.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'image/*': ['.png', '.jpg', '.jpeg'] }} />
      <select value={targetFormat} onChange={e => setTargetFormat(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm mb-3">
        {conversions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <button onClick={doConvert} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Converting...' : 'Convert'}
      </button>
    </ToolLayout>
  )
}

function RotateTool({ onBack }) {
  const [file, setFile] = useState(null); const [degrees, setDegrees] = useState(90); const [busy, setBusy] = useState(false)
  const doRotate = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('degrees', degrees)
    try {
      const res = await fetch('/api/pdf-tools/rotate', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Rotate failed'); return }
      downloadBlob(await res.blob(), 'rotated.pdf')
      toast.success('Rotated!')
    } catch { toast.error('Rotate failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="rotate" title="Rotate PDF" description="Rotate all pages in a PDF.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <div className="flex gap-2 mb-4">
        {[90, 180, 270].map(d => (
          <button key={d} onClick={() => setDegrees(d)} className={`px-4 py-2 rounded-lg border text-sm font-medium ${degrees === d ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {d}°
          </button>
        ))}
      </div>
      <button onClick={doRotate} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Rotating...' : 'Rotate PDF'}
      </button>
    </ToolLayout>
  )
}

function ExtractTool({ onBack }) {
  const [file, setFile] = useState(null); const [pages, setPages] = useState('1'); const [busy, setBusy] = useState(false)
  const doExtract = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('pages', pages)
    try {
      const res = await fetch('/api/pdf-tools/extract', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Extract failed'); return }
      downloadBlob(await res.blob(), 'extracted.pdf')
      toast.success('Extracted!')
    } catch { toast.error('Extract failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="extract" title="Extract Pages" description="Extract specific pages into a new PDF.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <input value={pages} onChange={e => setPages(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm mb-3" placeholder="e.g. 1, 3, 5-8" />
      <button onClick={doExtract} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Extracting...' : 'Extract Pages'}
      </button>
    </ToolLayout>
  )
}

function WatermarkTool({ onBack }) {
  const [file, setFile] = useState(null); const [text, setText] = useState('DRAFT'); const [busy, setBusy] = useState(false)
  const doWatermark = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('text', text || 'DRAFT')
    try {
      const res = await fetch('/api/pdf-tools/watermark', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Watermark failed'); return }
      downloadBlob(await res.blob(), 'watermarked.pdf')
      toast.success('Watermarked!')
    } catch { toast.error('Watermark failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="watermark" title="Add Watermark" description="Add text watermark to every page.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <input value={text} onChange={e => setText(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm mb-3" placeholder="Watermark text" />
      <button onClick={doWatermark} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Adding watermark...' : 'Add Watermark'}
      </button>
    </ToolLayout>
  )
}

function PageNumbersTool({ onBack }) {
  const [file, setFile] = useState(null); const [start, setStart] = useState(1); const [busy, setBusy] = useState(false)
  const doPageNumbers = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('start', start)
    try {
      const res = await fetch('/api/pdf-tools/page-numbers', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Failed to add page numbers'); return }
      downloadBlob(await res.blob(), 'numbered.pdf')
      toast.success('Page numbers added!')
    } catch { toast.error('Failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="page-numbers" title="Add Page Numbers" description="Add page numbers to your PDF.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <div className="mb-3">
        <label className="text-sm font-medium text-gray-700">Starting number</label>
        <input type="number" min={1} value={start} onChange={e => setStart(Number(e.target.value))} className="w-full rounded-lg border-gray-300 text-sm" />
      </div>
      <button onClick={doPageNumbers} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Adding...' : 'Add Page Numbers'}
      </button>
    </ToolLayout>
  )
}

function ReorderTool({ onBack }) {
  const [file, setFile] = useState(null); const [order, setOrder] = useState('2,1'); const [busy, setBusy] = useState(false)
  const doReorder = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('order', order)
    try {
      const res = await fetch('/api/pdf-tools/reorder', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Reorder failed'); return }
      downloadBlob(await res.blob(), 'reordered.pdf')
      toast.success('Reordered!')
    } catch { toast.error('Reorder failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="reorder" title="Reorder Pages" description="Change page order or remove pages.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <input value={order} onChange={e => setOrder(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm mb-3" placeholder="e.g. 2,1,3 or 3-1" />
      <p className="text-xs text-gray-400 mb-3">Enter page order separated by commas. Use dashes for ranges (e.g. 3-1 reverses pages 1-3).</p>
      <button onClick={doReorder} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Reordering...' : 'Reorder Pages'}
      </button>
    </ToolLayout>
  )
}

function OcrTool({ onBack }) {
  const [file, setFile] = useState(null); const [busy, setBusy] = useState(false)
  const doOcr = async () => {
    if (!file) { toast.error('Upload a scanned PDF'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file)
    try {
      const res = await fetch('/api/pdf-tools/ocr', { method: 'POST', body: form })
      if (!res.ok) { toast.error('OCR failed'); return }
      downloadBlob(await res.blob(), 'ocr.pdf')
      toast.success('OCR complete!')
    } catch { toast.error('OCR failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="ocr" title="OCR PDF" description="Recognize text in scanned documents. Requires Tesseract on the server.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <button onClick={doOcr} disabled={busy || !file} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Running OCR...' : 'Run OCR'}
      </button>
    </ToolLayout>
  )
}

function EncryptTool({ onBack }) {
  const [file, setFile] = useState(null); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false)
  const doEncrypt = async () => {
    if (!file) { toast.error('Upload a PDF'); return }
    if (!password) { toast.error('Enter a password'); return }
    setBusy(true)
    const form = new FormData(); form.append('file', file); form.append('password', password)
    try {
      const res = await fetch('/api/pdf-tools/encrypt', { method: 'POST', body: form })
      if (!res.ok) { toast.error('Encrypt failed'); return }
      downloadBlob(await res.blob(), 'encrypted.pdf')
      toast.success('Encrypted!')
    } catch { toast.error('Encrypt failed') }
    finally { setBusy(false) }
  }
  return (
    <ToolLayout onBack={onBack} toolId="encrypt" title="Encrypt PDF" description="Password-protect your PDF with AES-256 encryption.">
      <FileUpload onFile={setFile} accept={{ 'application/pdf': ['.pdf'] }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
        className="w-full rounded-lg border-gray-300 text-sm mb-3" placeholder="Enter password" />
      <button onClick={doEncrypt} disabled={busy || !file || !password} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
        {busy ? 'Encrypting...' : 'Encrypt PDF'}
      </button>
    </ToolLayout>
  )
}

const toolComponents = {
  merge: MergeTool,
  split: SplitTool,
  compress: CompressTool,
  convert: ConvertTool,
  rotate: RotateTool,
  extract: ExtractTool,
  watermark: WatermarkTool,
  'page-numbers': PageNumbersTool,
  reorder: ReorderTool,
  ocr: OcrTool,
  encrypt: EncryptTool,
}

export default function PdfToolsModule() {
  const [selectedTool, setSelectedTool] = useState(null)

  if (selectedTool) {
    const Component = toolComponents[selectedTool]
    return Component ? <Component onBack={() => setSelectedTool(null)} /> : null
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">PDF Tools</h2>
      <p className="text-gray-500 mb-6">Complete PDF toolkit — all processing is done locally on your laptop.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(toolIcons).map(([id, t]) => (
          <button key={id} onClick={() => setSelectedTool(id)}
            className={`p-4 rounded-xl border text-left hover:shadow-md transition-shadow ${t.color}`}>
            <span className="text-2xl block mb-2">{t.icon}</span>
            <h4 className="font-semibold text-sm">{t.label}</h4>
          </button>
        ))}
      </div>
    </div>
  )
}
