import { useState } from 'react'
import toast from 'react-hot-toast'

function AiPosterModule() {
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)

  const handleGenerate = async () => {
    if (!description.trim()) { toast.error('Please describe your event'); return }

    setGenerating(true)
    setResult(null)
    const params = new URLSearchParams({ description })

    try {
      const res = await fetch('/api/ai-poster/generate', { method: 'POST', body: params })
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
        toast.success('Poster created!')
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">AI Poster</h2>
      <p className="text-gray-500 mb-6">
        Describe your event in plain English. The AI extracts the details and designs a poster automatically.
      </p>

      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your event
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-lg border-gray-300 text-sm resize-none"
            placeholder={`e.g. "Annual school science fair on Friday March 15th 2026 at the school auditorium. Theme: Exploring the World of Science. Open to all parents and students."`}
          />
          <p className="text-xs text-gray-400 mt-1">Include: event type, date, venue, and any theme if applicable.</p>

          <button
            onClick={handleGenerate}
            disabled={generating || !description.trim()}
            className="mt-4 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-pulse">✨</span> AI is thinking...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">✨ Generate with AI</span>
            )}
          </button>
        </div>

        {!result && !generating && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-700 text-sm font-medium">⚡ Requires Ollama</p>
            <p className="text-amber-600 text-xs mt-1">
              This module needs Ollama running locally. If it fails, use the{' '}
              <a href="/poster-maker" className="underline">Poster Maker</a> manually instead.
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5">
            <h3 className="font-semibold text-green-700 mb-2">✅ Poster Generated!</h3>
            <div className="space-y-1 text-sm text-green-600">
              <p>Title: {result.title}</p>
              <p>Subtitle: {result.subtitle}</p>
              <p>Date: {result.date}</p>
              <p>Venue: {result.venue}</p>
              <p>Theme: {result.theme}</p>
            </div>
            {result.download_url && (
              <a
                href={result.download_url}
                className="mt-3 inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                Download Poster
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  id: 'ai-poster',
  name: 'AI Poster',
  icon: 'magic',
  component: AiPosterModule,
  order: 5,
}
