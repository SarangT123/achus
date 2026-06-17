import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

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

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)
    const form = new FormData()
    form.append('path', currentPath)
    acceptedFiles.forEach(f => form.append('files', f))
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const params = new URLSearchParams({ path: `${currentPath}/${newFolderName}`.replace(/\/+/g, '/') })
      const res = await fetch('/api/storage/mkdir', { method: 'POST', body: params })
      const data = await res.json()
      if (data.success) {
        toast.success('Folder created')
        setNewFolderName(''); setShowNewFolder(false)
        fetchEntries(currentPath)
      } else toast.error(data.error)
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
  const navigateTo = (idx) => {
    const path = '/' + breadcrumbs.slice(0, idx + 1).join('/')
    setCurrentPath(path)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Cloud Storage</h2>
      <p className="text-gray-500 mb-6">Upload, organize, and access your files from anywhere.</p>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <button onClick={() => setCurrentPath('/')} className="text-primary-600 hover:underline">Root</button>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button onClick={() => navigateTo(idx)} className="text-primary-600 hover:underline">{crumb}</button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div {...getRootProps()} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
          isDragActive ? 'bg-primary-100 text-primary-700' : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}>
          <input {...getInputProps()} />
          {uploading ? '⏳ Uploading...' : '📤 Upload'}
        </div>
        <button
          onClick={() => setShowNewFolder(!showNewFolder)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          📁 New Folder
        </button>
      </div>

      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createFolder() }}
            placeholder="Folder name"
            className="w-48 rounded-lg border-gray-300 text-sm"
            autoFocus
          />
          <button onClick={createFolder} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm">Create</button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="px-3 py-1.5 text-gray-500 text-sm">Cancel</button>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">📂</div>
          <p className="text-gray-400">This folder is empty</p>
          <p className="text-gray-300 text-sm">Upload files or create a new folder</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {entries.map(entry => (
            <div
              key={entry.name}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl flex-shrink-0">{entry.is_dir ? '📁' : '📄'}</span>
                {entry.is_dir ? (
                  <button
                    onClick={() => setCurrentPath(`${currentPath}/${entry.name}`.replace(/\/+/g, '/'))}
                    className="text-sm font-medium text-primary-600 hover:underline truncate"
                  >
                    {entry.name}
                  </button>
                ) : (
                  <a
                    href={`/api/storage/download/${currentPath}/${entry.name}`.replace(/\/+/g, '/')}
                    className="text-sm font-medium text-gray-700 hover:text-primary-600 truncate"
                  >
                    {entry.name}
                  </a>
                )}
                {!entry.is_dir && (
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(entry.size)}</span>
                )}
              </div>
              <button
                onClick={() => deleteItem(entry.name, entry.is_dir)}
                className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0 ml-2"
              >
                🗑️
              </button>
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
