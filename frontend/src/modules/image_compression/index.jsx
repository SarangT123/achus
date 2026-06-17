import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

function ImageCompressionModule() {
  const [targetSize, setTargetSize] = useState(500)
  const [unit, setUnit] = useState('KB')
  const [file, setFile] = useState(null)
  const [processing, setProcessing] = useState(false)

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'] },
    maxFiles: 1,
  })

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleCompress = async () => {
    if (!file) { toast.error('Please upload an image first'); return }

    setProcessing(true)
    const form = new FormData()
    form.append('file', file)
    const targetBytes = unit === 'MB' ? targetSize * 1024 : targetSize
    form.append('target_size', targetBytes)

    try {
      const res = await fetch('/api/image-compression/compress', { method: 'POST', body: form })
      if (!res.ok) {
        toast.error('Compression failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Done! Check your downloads.')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Smart Image Compression</h2>
      <p className="text-gray-500 mb-6">Set a target file size and the tool will automatically find the right quality.</p>

      {/* Upload */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-6 ${
          isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-3">{file ? '🖼️' : isDragActive ? '📥' : '📤'}</div>
        {file ? (
          <div>
            <p className="font-medium text-gray-700">{file.name}</p>
            <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
          </div>
        ) : isDragActive ? (
          <p className="text-primary-600 font-medium">Drop your image here</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">Drag & drop an image or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">PNG, JPG, WebP, BMP, TIFF</p>
          </div>
        )}
      </div>

      {/* Target size */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Target File Size</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={1}
            max={10000}
            value={targetSize}
            onChange={e => setTargetSize(parseInt(e.target.value) || 1)}
            className="w-24 rounded-lg border-gray-300 text-sm"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="rounded-lg border-gray-300 text-sm"
          >
            <option value="KB">KB</option>
            <option value="MB">MB</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleCompress}
        disabled={!file || processing}
        className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? 'Compressing...' : 'Compress & Download'}
      </button>
    </div>
  )
}

export default {
  id: 'image-compression',
  name: 'Image Compression',
  icon: 'compress',
  component: ImageCompressionModule,
  order: 3,
}
