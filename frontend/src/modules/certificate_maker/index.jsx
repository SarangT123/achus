import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../utils/api'

const THEMES = [
  { id: 'classic', name: 'Classic Gold', desc: 'Elegant serif with gold accents' },
  { id: 'modern', name: 'Modern Blue', desc: 'Clean sans-serif with blue accent' },
  { id: 'colorful', name: 'Colorful Fun', desc: 'Bright and playful for kids' },
]

const SIZES = [
  { id: 'a4-landscape', name: 'A4 Landscape' },
  { id: 'a4-portrait', name: 'A4 Portrait' },
]

function CertificateMakerModule() {
  const [tab, setTab] = useState('single')
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    student_name: '', course_name: '', date: '', description: '', signature_name: '',
    theme: 'classic', size: 'a4-landscape',
  })

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSingle = async () => {
    if (!form.student_name.trim() || !form.course_name.trim()) {
      toast.error('Student name and course are required'); return
    }
    setBusy(true)
    try {
      const params = new URLSearchParams(form)
      const res = await api('/api/certificate/generate', { method: 'POST', body: params })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const data = await res.json(); toast.error(data.error); return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'certificate.pdf'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Certificate generated!')
    } catch { toast.error('Generation failed') }
    finally { setBusy(false) }
  }

  const handleBulk = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('theme', form.theme)
    formData.append('size', form.size)
    try {
      const res = await api('/api/certificate/bulk', { method: 'POST', body: formData })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const data = await res.json(); toast.error(data.error); return
      }
      const blob = await res.blob()
      const ext = ct.includes('zip') ? 'zip' : 'pdf'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `certificates.${ext}`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Certificates generated!')
    } catch { toast.error('Bulk generation failed') }
    finally { setBusy(false); e.target.value = '' }
  }

  const downloadCsvTemplate = () => {
    const csv = 'student_name,course_name,date,description,signature_name\n' +
      '"Alice Johnson","Introduction to Python","2026-06-15","Completed 40 hours with distinction","Principal"\n' +
      '"Bob Smith","Mathematics Grade 10","2026-06-15","","Head of Department"'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'certificate_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Certificate Maker</h2>
      <p className="text-gray-500 mb-6">Generate completion certificates for students.</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('single')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'single' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Single Certificate
        </button>
        <button onClick={() => setTab('bulk')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'bulk' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Bulk from CSV
        </button>
      </div>

      <div className="max-w-2xl space-y-4">
        {tab === 'single' ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Student Name *</label>
                <input value={form.student_name} onChange={e => update('student_name', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm" placeholder="e.g. Alice Johnson" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Course / Subject *</label>
                <input value={form.course_name} onChange={e => update('course_name', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm" placeholder="e.g. Introduction to Python" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Signed By</label>
                <input value={form.signature_name} onChange={e => update('signature_name', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm" placeholder="e.g. Principal" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)}
                rows={2} className="w-full rounded-lg border-gray-300 text-sm resize-none"
                placeholder="e.g. Completed 40 hours with distinction" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Theme</label>
                <select value={form.theme} onChange={e => update('theme', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm">
                  {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">{THEMES.find(t => t.id === form.theme)?.desc}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Size</label>
                <select value={form.size} onChange={e => update('size', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm">
                  {SIZES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSingle} disabled={busy}
              className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {busy ? 'Generating...' : '🎓 Generate Certificate'}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Upload a CSV file with columns: <code className="bg-gray-100 px-1 rounded text-xs">student_name, course_name, date, description, signature_name</code>
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} disabled={busy}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                {busy ? 'Processing...' : '📁 Upload CSV'}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleBulk} />
              <button onClick={downloadCsvTemplate}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Download Template
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Theme</label>
                <select value={form.theme} onChange={e => update('theme', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm">
                  {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Size</label>
                <select value={form.size} onChange={e => update('size', e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm">
                  {SIZES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Single row = one PDF. Multiple rows = ZIP of all certificates.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  id: 'certificate-maker',
  name: 'Certificate Maker',
  icon: 'poster',
  component: CertificateMakerModule,
  order: 7,
}
