import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

function AutoPrintModule() {
  const [status, setStatus] = useState({ online: false, queue_count: 0, printers: [] })
  const [queue, setQueue] = useState([])
  const [history, setHistory] = useState([])
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState('print')

  const fetchAll = () => {
    fetch('/api/auto-print/status')
      .then(r => r.json())
      .then(res => { if (res.success) setStatus(res.data) })
      .catch(() => {})
    fetch('/api/auto-print/queue')
      .then(r => r.json())
      .then(res => { if (res.success) setQueue(res.data) })
      .catch(() => {})
    fetch('/api/auto-print/history?limit=10')
      .then(r => r.json())
      .then(res => { if (res.success) setHistory(res.data) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [])

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are accepted')
      return
    }

    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/auto-print/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.success) {
        toast.success(data.data.message)
        fetchAll()
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  })

  const removeFromQueue = async (filename) => {
    try {
      const res = await fetch(`/api/auto-print/queue/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { toast.success('Removed from queue'); fetchAll() }
    } catch {}
  }

  const clearQueue = async () => {
    if (!confirm('Remove all files from the print queue?')) return
    try {
      const res = await fetch('/api/auto-print/queue/clear', { method: 'POST' })
      const data = await res.json()
      if (data.success) { toast.success(data.data.message); fetchAll() }
    } catch {}
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString()
  }

  const printerName = status.printers?.[0]?.name || 'Default Printer'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Auto Print</h2>
      <p className="text-gray-500 mb-6">Drag-and-drop a PDF to print. Jobs queue automatically when the printer is disconnected.</p>

      {/* Status */}
      <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
        status.online
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-yellow-200 bg-yellow-50 text-yellow-700'
      }`}>
        <span className={`w-3 h-3 rounded-full ${status.online ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <div>
          <span className="font-medium">
            {status.online
              ? `Printer Online — Ready to Print`
              : `Printer Offline — ${status.queue_count} job${status.queue_count !== 1 ? 's' : ''} queued`}
          </span>
          {status.printers?.[0] && (
            <p className="text-xs opacity-75 mt-0.5">
              {printerName} — {status.printers[0].status}
            </p>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 md:p-16 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-300 bg-white'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">
          {uploading ? '⏳' : isDragActive ? '📄' : '📋'}
        </div>
        {uploading ? (
          <p className="text-gray-600 font-medium">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-primary-600 font-medium">Drop your PDF here</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">Drag & drop a PDF here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {/* Tabs: Queue / History */}
      <div className="mt-8 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('print')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 ${
            tab === 'print'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Print Queue {queue.length > 0 && `(${queue.length})`}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 ${
            tab === 'history'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🕐 Print History
        </button>
      </div>

      {/* Queue Tab */}
      {tab === 'print' && (
        <div className="mt-4">
          {queue.length > 0 && (
            <div className="flex justify-end mb-2">
              <button onClick={clearQueue} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Clear All
              </button>
            </div>
          )}
          {queue.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">Queue is empty</p>
              <p className="text-xs mt-1">Upload a PDF above to print</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(item => (
                <div key={item.filename} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">📄</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{item.filename}</p>
                      <p className="text-xs text-gray-400">
                        {(item.size / 1024).toFixed(1)} KB
                        {item.modified && <span> — {formatDate(item.modified)}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(item.filename)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0 ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="mt-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🕐</div>
              <p className="text-sm">No print history yet</p>
              <p className="text-xs mt-1">Successfully printed jobs will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{item.success ? '✅' : '❌'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{item.filename}</p>
                      <p className="text-xs text-gray-400">
                        {item.success ? 'Printed successfully' : `Failed: ${item.error || 'Unknown error'}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default {
  id: 'auto-print',
  name: 'Auto Print',
  icon: 'printer',
  component: AutoPrintModule,
  order: 1,
}
