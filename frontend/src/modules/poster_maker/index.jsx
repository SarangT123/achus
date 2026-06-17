import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const themeColors = {
  modern: { bg: 'bg-blue-50 border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700' },
  classic: { bg: 'bg-gray-50 border-gray-200', btn: 'bg-gray-800 hover:bg-gray-900' },
  nature: { bg: 'bg-emerald-50 border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  celebration: { bg: 'bg-amber-50 border-amber-200', btn: 'bg-amber-600 hover:bg-amber-700' },
}

function PosterMakerModule() {
  const [templates, setTemplates] = useState([])
  const [themes, setThemes] = useState([])
  const [form, setForm] = useState({ title: '', subtitle: '', date: '', venue: '', template: 'event', theme: 'modern' })
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/poster-maker/templates')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setTemplates(res.data.templates)
          setThemes(res.data.themes)
        }
      })
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!form.title || !form.date || !form.venue) {
      toast.error('Title, Date, and Venue are required')
      return
    }

    setGenerating(true)
    const params = new URLSearchParams(form)
    try {
      const res = await fetch('/api/poster-maker/generate', { method: 'POST', body: params })
      if (!res.ok) { toast.error('Generation failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `poster_${form.title.replace(/\s+/g, '_').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Poster generated!')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const currentTheme = themeColors[form.theme] || themeColors.modern

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Poster Maker</h2>
      <p className="text-gray-500 mb-6">Fill in the details and get a print-ready poster in seconds.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className={`rounded-xl border p-5 ${currentTheme.bg}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm"
                placeholder="School Science Fair"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text" value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm"
                placeholder="Exploring the World of Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="text" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm"
                placeholder="Friday, March 15, 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
              <input
                type="text" value={form.venue}
                onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm"
                placeholder="School Auditorium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                value={form.template}
                onChange={e => setForm(f => ({ ...f, template: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
              <div className="flex gap-2 flex-wrap">
                {themes.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, theme: t.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.theme === t.id
                        ? 'border-gray-800 bg-gray-800 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full mt-5 py-3 text-white font-medium rounded-xl transition-colors ${currentTheme.btn} disabled:opacity-50`}
          >
            {generating ? 'Generating...' : 'Generate Poster'}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-gray-400 text-sm">Your poster preview will appear here</p>
            <p className="text-gray-300 text-xs mt-1">Generated as a high-res print-ready PDF</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default {
  id: 'poster-maker',
  name: 'Poster Maker',
  icon: 'poster',
  component: PosterMakerModule,
  order: 4,
}
