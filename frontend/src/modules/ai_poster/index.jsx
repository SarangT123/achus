import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

function downloadBlob(res, filename) {
  const blob = new Blob([res])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function AiPosterModule() {
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [ollamaOk, setOllamaOk] = useState(null)

  const handleGenerate = async () => {
    if (!description.trim()) { toast.error('Please describe your event'); return }
    setGenerating(true)

    const params = new URLSearchParams({ description })

    try {
      const res = await fetch('/api/ai-poster/generate', { method: 'POST', body: params })
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('application/pdf')) {
        const blob = await res.blob()
        downloadBlob(blob, 'ai_poster.pdf')
        toast.success('Poster generated and downloaded!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Generation failed')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const checkOllama = async () => {
    try {
      const res = await fetch('/api/ai-poster/health')
      const data = await res.json()
      setOllamaOk(data.data?.ollama_running === true)
    } catch {
      setOllamaOk(false)
    }
  }

  useEffect(() => { checkOllama() }, [])

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

        {!generating && ollamaOk === false && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-700 text-sm font-medium">⚡ Ollama is not running</p>
            <p className="text-amber-600 text-xs mt-1">
              Start Ollama with <code className="bg-amber-100 px-1 rounded">ollama serve</code> on the server.
              Meanwhile, use the{' '}
              <Link to="/poster-maker" className="underline font-medium">Poster Maker</Link> manually.
            </p>
          </div>
        )}

        {!generating && ollamaOk === true && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-700 text-sm font-medium">✅ Ollama is running</p>
            <p className="text-green-600 text-xs mt-1">Describe your event above and click generate.</p>
          </div>
        )}

        {generating && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2 animate-bounce">✨</div>
            <p className="text-indigo-700 text-sm font-medium">Processing your description...</p>
            <p className="text-indigo-500 text-xs mt-1">AI is extracting event details and designing your poster</p>
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
