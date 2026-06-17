import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleString()
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function CloudStorageModule() {
  const [currentPath, setCurrentPath] = useState('/')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileInputRef = useRef(null)

  const fetchEntries = useCallback(async (path) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/storage/list?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.success) setEntries(data.data.entries)
      else toast.error(data.error)
    } catch { toast.error('Failed to load directory') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchEntries(currentPath) }, [currentPath, fetchEntries])

  const uploadFiles = useCallback(async (files) => {
    if (!files.length) return
    setUploading(true)
    const form = new FormData()
    form.append('path', currentPath)
    Array.from(files).forEach(f => form.append('files', f))
    try {
      const res = await fetch('/api/storage/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.success) {
        toast.success(`Uploaded ${data.data.uploaded.length} file(s)`)
        fetchEntries(currentPath)
      } else toast.error(data.error)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }, [currentPath, fetchEntries])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    noClick: true,
    noKeyboard: true,
  })

  const handleFileSelect = (e) => {
    uploadFiles(e.target.files)
    e.target.value = ''
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const params = new URLSearchParams({ path: `${currentPath}/${newFolderName}`.replace(/\/+/g, '/') })
      const res = await fetch('/api/storage/mkdir', { method: 'POST', body: params })
      const data = await res.json()
      if (data.success) { toast.success('Folder created'); setNewFolderName(''); setShowNewFolder(false); fetchEntries(currentPath) }
      else toast.error(data.error)
    } catch { toast.error('Failed to create folder') }
  }

  const deleteItem = async (name, isDir) => {
    const path = `${currentPath}/${name}`.replace(/\/+/g, '/')
    if (!confirm(`Delete ${isDir ? 'folder' : 'file'} "${name}"?`)) return
    const params = new URLSearchParams({ path })
    try {
      const res = await fetch('/api/storage/delete', { method: 'DELETE', body: params })
      const data = await res.json()
      if (data.success) { toast.success('Deleted'); fetchEntries(currentPath) }
      else toast.error(data.error)
    } catch { toast.error('Delete failed') }
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean)

  return (
    <div {...getRootProps()} className="relative min-h-[300px]">
      <input {...getInputProps()} />

      <h2 className="text-2xl font-bold mb-2">Cloud Storage</h2>
      <p className="text-gray-500 mb-6">Upload, organize, and access your files from anywhere.</p>

      {isDragActive && (
        <div className="absolute inset-0 z-10 bg-primary-500/10 border-4 border-dashed border-primary-400 rounded-2xl flex items-center justify-center">
          <p className="text-primary-600 text-xl font-semibold bg-white px-6 py-3 rounded-xl shadow-lg">Drop files here</p>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <button onClick={() => setCurrentPath('/')} className={`px-2 py-1 rounded ${currentPath === '/' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-primary-600 hover:underline'}`}>
          Root
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button onClick={() => setCurrentPath('/' + breadcrumbs.slice(0, idx + 1).join('/'))} className="text-primary-600 hover:underline px-1">
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5">
          {uploading ? '⏳' : '📤'} {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        <button onClick={() => setShowNewFolder(!showNewFolder)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
          📁 New Folder
        </button>
        {currentPath !== '/' && (
          <button onClick={() => setCurrentPath('/' + breadcrumbs.slice(0, -1).join('/'))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
            ⬆ Up
          </button>
        )}
      </div>

      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createFolder() }}
            placeholder="Folder name" className="w-48 rounded-lg border-gray-300 text-sm" autoFocus />
          <button onClick={createFolder} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm">Create</button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="px-3 py-1.5 text-gray-500 text-sm">Cancel</button>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-5xl mb-3">📂</div>
          <p className="text-gray-400">This folder is empty</p>
          <p className="text-gray-300 text-sm">Upload files or create a new folder</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Modified</div>
            <div className="col-span-1"></div>
          </div>
          {entries.map(entry => (
            <div key={entry.name} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
              {/* Name */}
              <div className="col-span-6 flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{entry.is_dir ? '📁' : '📄'}</span>
                {entry.is_dir ? (
                  <button onClick={() => setCurrentPath(`${currentPath}/${entry.name}`.replace(/\/+/g, '/'))}
                    className="text-sm font-medium text-primary-600 hover:underline truncate">
                    {entry.name}
                  </button>
                ) : (
                  <a href={`/api/storage/download/${currentPath}/${entry.name}`.replace(/\/+/g, '/')}
                    className="text-sm font-medium text-gray-700 hover:text-primary-600 truncate">
                    {entry.name}
                  </a>
                )}
              </div>
              {/* Size (desktop only) */}
              <div className="hidden md:block col-span-2 text-sm text-gray-400">
                {entry.is_dir ? '—' : formatSize(entry.size)}
              </div>
              {/* Modified (desktop only) */}
              <div className="hidden md:block col-span-3 text-sm text-gray-400 truncate">
                {formatDate(entry.modified)}
              </div>
              {/* Actions */}
              <div className="col-span-1 flex justify-end gap-2">
                <button onClick={() => deleteItem(entry.name, entry.is_dir)}
                  className="text-gray-400 hover:text-red-500 text-sm" title="Delete">
                  🗑️
                </button>
              </div>
              {/* Mobile meta row */}
              <div className="md:hidden col-span-12 text-xs text-gray-400 -mt-1 flex gap-3">
                <span>{entry.is_dir ? 'Folder' : formatSize(entry.size)}</span>
                <span>{formatDate(entry.modified)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default {
  id: 'cloud-storage',
  name: 'Cloud Storage',
  icon: 'cloud',
  component: CloudStorageModule,
  order: 6,
}
