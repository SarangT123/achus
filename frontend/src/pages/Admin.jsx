import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../utils/api'

function AdminPage() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api('/api/admin/users')
      if (res.success) setUsers(res.data)
      else toast.error(res.error)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.username}" and all their files?`)) return
    try {
      const res = await api(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (res.success) { toast.success(res.data.message); fetchUsers() }
      else toast.error(res.error)
    } catch { toast.error('Delete failed') }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>
      <p className="text-gray-500 mb-6">Manage users and system storage.</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'users' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          👥 Users
        </button>
        <button onClick={() => setTab('storage')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'storage' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📦 Storage
        </button>
      </div>

      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{users.length} user(s)</p>
            <button onClick={() => setShowCreate(!showCreate)}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm">
              + New User
            </button>
          </div>

          {showCreate && <CreateUserForm onDone={() => { setShowCreate(false); fetchUsers() }} />}

          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading...</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-4">Username</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-3">Created</div>
                <div className="col-span-2"></div>
              </div>
              {users.map(u => (
                <div key={u.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
                  <div className="col-span-4 text-sm font-medium">{u.username}</div>
                  <div className="col-span-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="col-span-3 text-sm text-gray-400">{new Date(u.created_at).toLocaleDateString()}</div>
                  <div className="col-span-2 text-right">
                    <button onClick={() => handleDelete(u)} className="text-xs text-red-500 hover:text-red-700" title="Delete user">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'storage' && <StorageBrowser />}
    </div>
  )
}

function CreateUserForm({ onDone }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [busy, setBusy] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { toast.error('Fill all fields'); return }
    setBusy(true)
    try {
      const params = new URLSearchParams({ username, password, role })
      const res = await api('/api/admin/users', { method: 'POST', body: params })
      if (res.success) { toast.success('User created'); onDone() }
      else toast.error(res.error)
    } catch { toast.error('Failed') }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={handleCreate} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} className="rounded-lg border-gray-300 text-sm w-36" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-lg border-gray-300 text-sm w-36" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Role</label>
        <select value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border-gray-300 text-sm w-24">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit" disabled={busy} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm">Create</button>
    </form>
  )
}

function StorageBrowser() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [entries, setEntries] = useState([])
  const [path, setPath] = useState('/')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api('/api/admin/users').then(res => { if (res.success) setUsers(res.data) })
  }, [])

  const browse = async (username, dir) => {
    setSelectedUser(username)
    setPath(dir)
    setLoading(true)
    try {
      const res = await api(`/api/admin/storage/${username}?path=${encodeURIComponent(dir)}`)
      if (res.success) setEntries(res.data.entries)
      else toast.error(res.error)
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  const deleteFile = async (name, isDir) => {
    if (!confirm(`Delete "${name}"?`)) return
    const filePath = `${path}/${name}`.replace(/\/+/g, '/')
    const params = new URLSearchParams({ path: filePath })
    try {
      const res = await api(`/api/admin/storage/${selectedUser}`, { method: 'DELETE', body: params })
      if (res.success) { toast.success('Deleted'); browse(selectedUser, path) }
      else toast.error(res.error)
    } catch { toast.error('Failed') }
  }

  if (!selectedUser) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-3">Select a user to browse their storage:</p>
        <div className="flex flex-wrap gap-2">
          {users.map(u => (
            <button key={u.id} onClick={() => browse(u.username, '/')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              📁 {u.username}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const breadcrumbs = path.split('/').filter(Boolean)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => { setSelectedUser(null); setEntries([]) }}
          className="text-sm text-primary-600 hover:underline">← Back to users</button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium">📁 {selectedUser}</span>
        <span className="text-gray-300">/</span>
        <button onClick={() => browse(selectedUser, '/')} className="text-sm text-primary-600 hover:underline">Root</button>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button onClick={() => browse(selectedUser, '/' + breadcrumbs.slice(0, i+1).join('/'))}
              className="text-sm text-primary-600 hover:underline">{crumb}</button>
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">Empty folder</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {entries.map(e => (
            <div key={e.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0">
              <div className="flex items-center gap-2">
                <span>{e.is_dir ? '📁' : '📄'}</span>
                {e.is_dir ? (
                  <button onClick={() => browse(selectedUser, `${path}/${e.name}`.replace(/\/+/g, '/'))}
                    className="text-sm text-primary-600 hover:underline">{e.name}</button>
                ) : (
                  <span className="text-sm text-gray-700">{e.name}</span>
                )}
                <span className="text-xs text-gray-400">{e.is_dir ? '' : `${(e.size / 1024).toFixed(1)} KB`}</span>
              </div>
              <button onClick={() => deleteFile(e.name, e.is_dir)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminPage
