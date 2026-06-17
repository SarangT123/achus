import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

function AutoPrintModule() {
  const [status, setStatus] = useState({ online: false, queue_count: 0 })
  const [queue, setQueue] = useState([])
  const [uploading, setUploading] = useState(false)

  const fetchStatus = () => {
    fetch('/api/auto-print/status')
      .then(r => r.json())
      .then(res => { if (res.success) setStatus(res.data) })
      .catch(() => {})
  }

  const fetchQueue = () => {
    fetch('/api/auto-print/queue')
      .then(r => r.json())
      .then(res => { if (res.success) setQueue(res.data) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchStatus()
    fetchQueue()
    const interval = setInterval(() => { fetchStatus(); fetchQueue() }, 5000)
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
        fetchQueue()
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
      if (data.success) {
        toast.success('Removed from queue')
        fetchQueue()
      }
    } catch {}
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Auto Print</h2>
      <p className="text-gray-500 mb-6">Drag-and-drop a PDF to print immediately or queue for later.</p>

      {/* Status indicator */}
      <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
        status.online
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-yellow-200 bg-yellow-50 text-yellow-700'
      }`}>
        <span className={`w-3 h-3 rounded-full ${status.online ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <span className="font-medium">
          {status.online
            ? `Printer Online (Ready to Print)`
            : `Printer Offline (${status.queue_count} jobs queued)`}
        </span>
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

      {/* Queue */}
      {queue.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Print Queue ({queue.length})</h3>
          <div className="space-y-2">
            {queue.map(item => (
              <div key={item.filename} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{item.filename}</p>
                    <p className="text-xs text-gray-400">{(item.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFromQueue(item.filename)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
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
