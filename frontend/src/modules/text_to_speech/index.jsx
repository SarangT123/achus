import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../utils/api'

function TtsModule() {
  const [text, setText] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural')
  const [rate, setRate] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(false)
  const utteranceRef = useRef(null)

  useEffect(() => {
    api('/api/tts/voices').then(res => {
      if (res.success) setVoices(res.data.voices)
    }).catch(() => {})
  }, [])

  const groupedVoices = voices.reduce((acc, v) => {
    const locale = v.locale.split('-')[0]
    if (!acc[locale]) acc[locale] = []
    acc[locale].push(v)
    return acc
  }, {})

  const playBrowser = () => {
    if (!text.trim()) { toast.error('Enter some text'); return }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = selectedVoice.split('-').slice(0, 2).join('-')
      u.rate = 0.8 + (rate / 100) * 0.4
      u.onstart = () => { setSpeaking(true); setPaused(false) }
      u.onend = () => { setSpeaking(false); setPaused(false) }
      u.onpause = () => setPaused(true)
      u.onresume = () => setPaused(false)
      utteranceRef.current = u
      window.speechSynthesis.speak(u)
    } else {
      toast.error('Browser speech not supported. Try the Download button.')
    }
  }

  const pausePlay = () => {
    if (paused) {
      window.speechSynthesis.resume()
    } else {
      window.speechSynthesis.pause()
    }
  }

  const stopPlay = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false); setPaused(false)
  }

  const download = async () => {
    if (!text.trim()) { toast.error('Enter some text'); return }
    setLoading(true)
    const params = new URLSearchParams({ text, voice: selectedVoice, rate: String(rate) })
    try {
      const res = await api('/api/tts/speak', { method: 'POST', body: params })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const data = await res.json(); toast.error(data.error); return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'speech.mp3'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Audio downloaded')
    } catch { toast.error('Download failed') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Text to Speech</h2>
      <p className="text-gray-500 mb-6">Convert text to spoken audio — play in browser or download as MP3.</p>

      <div className="max-w-2xl bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Text</label>
          <textarea value={text} onChange={e => setText(e.target.value)}
            rows={6} className="w-full rounded-lg border-gray-300 text-sm resize-none"
            placeholder="Type or paste text here to convert to speech..." />
          <p className="text-xs text-gray-400 mt-1">{text.length} characters</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Voice</label>
            <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm">
              {Object.entries(groupedVoices).map(([locale, vlist]) => (
                <optgroup key={locale} label={locale.toUpperCase()}>
                  {vlist.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name.replace('Neural', '').replace('(Neural)', '').trim()} ({v.gender})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Speed: {rate > 0 ? '+' : ''}{rate}%</label>
            <input type="range" min="-50" max="50" value={rate} onChange={e => setRate(Number(e.target.value))}
              className="w-full" />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Slow</span><span>Normal</span><span>Fast</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!speaking ? (
            <button onClick={playBrowser}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-1.5">
              ▶ Play in Browser
            </button>
          ) : (
            <>
              <button onClick={pausePlay}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button onClick={stopPlay}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                ⏹ Stop
              </button>
            </>
          )}
          <button onClick={download} disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
            {loading ? '⏳' : '⬇'} {loading ? 'Generating...' : 'Download MP3'}
          </button>
        </div>

        {speaking && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
            <span className="animate-pulse">🔊</span>
            {paused ? 'Playback paused' : 'Speaking...'}
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  id: 'text-to-speech',
  name: 'Text to Speech',
  icon: 'magic',
  component: TtsModule,
  order: 8,
}
