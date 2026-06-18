import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../utils/api'

const themeColors = {
  modern: { bg: 'bg-blue-50 border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700' },
  classic: { bg: 'bg-gray-50 border-gray-200', btn: 'bg-gray-800 hover:bg-gray-900' },
  nature: { bg: 'bg-emerald-50 border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  celebration: { bg: 'bg-amber-50 border-amber-200', btn: 'bg-amber-600 hover:bg-amber-700' },
}

const layoutPreviews = {
  minimal: { icon: '◻️', desc: 'Clean and airy' },
  vibrant: { icon: '🔶', desc: 'Bold color split' },
  classic: { icon: '🏛️', desc: 'Formal serif' },
  banner: { icon: '📋', desc: 'Header + card' },
}

function PosterMakerModule() {
  const [templates, setTemplates] = useState([])
  const [themes, setThemes] = useState([])
  const [form, setForm] = useState({ title: '', subtitle: '', description: '', date: '', time: '', venue: '', template: 'minimal', theme: 'modern' })
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          {/* Title */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Event Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title *</label>
                <input type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm" placeholder="School Science Fair" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
                <input type="text" value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm" placeholder="Exploring the World of Science" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4} className="w-full rounded-lg border-gray-300 text-sm resize-none" placeholder="A short description of the event, what to expect, or any additional information..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input type="text" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 text-sm" placeholder="March 15, 2026" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <input type="text" value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 text-sm" placeholder="10:00 AM" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Venue *</label>
                <input type="text" value={form.venue}
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm" placeholder="School Auditorium" />
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Layout</h3>
            {templates.length === 0 ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {templates.map(t => {
                  const preview = layoutPreviews[t.id] || {}
                  return (
                    <button key={t.id}
                      onClick={() => setForm(f => ({ ...f, template: t.id }))}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        form.template === t.id
                          ? 'border-gray-800 bg-gray-50 ring-1 ring-gray-800'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl mb-1">{preview.icon || '📄'}</div>
                      <div className="text-sm font-medium text-gray-700">{t.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Theme */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Colour Theme</h3>
            <div className="flex flex-wrap gap-2">
              {themes.map(t => (
                <button key={t.id}
                  onClick={() => setForm(f => ({ ...f, theme: t.id }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    form.theme === t.id
                      ? 'border-gray-800 bg-gray-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors[0] }}></span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate Poster PDF'}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-center min-h-[400px] lg:sticky lg:top-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-gray-400 text-sm">Your poster preview</p>
            <p className="text-gray-300 text-xs mt-1">Generated as a high-res print-ready PDF</p>
            {form.title && (
              <div className="mt-6 text-left max-w-xs mx-auto">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-xs space-y-1">
                  <p className="font-bold text-gray-800">{form.title}</p>
                  {form.subtitle && <p className="text-gray-500">{form.subtitle}</p>}
                  {form.description && <p className="text-gray-400 line-clamp-2">{form.description}</p>}
                  <p className="text-gray-600">📅 {form.date}{form.time ? `, ${form.time}` : ''}</p>
                  <p className="text-gray-600">📍 {form.venue}</p>
                  <p className="text-gray-300 pt-1 border-t mt-1">
                    Layout: {templates.find(t => t.id === form.template)?.name || form.template} · Theme: {themes.find(t => t.id === form.theme)?.name || form.theme}
                  </p>
                </div>
              </div>
            )}
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
