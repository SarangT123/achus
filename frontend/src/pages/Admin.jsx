import { useState, useEffect, useCallback, useRef } from 'react'
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
        <button onClick={() => setTab('modules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'modules' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🧩 Modules
        </button>
        <button onClick={() => setTab('system')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'system' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📊 System
        </button>
        <button onClick={() => setTab('logs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'logs' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📋 Logs
        </button>
        <button onClick={() => setTab('shell')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'shell' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          💻 Shell
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
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-3">Username</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-5"></div>
              </div>
              {users.map(u => (
                <UserRow key={u.id} user={u} onUpdate={fetchUsers} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'storage' && <StorageBrowser />}
      {tab === 'modules' && <ModulesManager />}
      {tab === 'system' && <SystemMonitor />}
      {tab === 'logs' && <LogViewer />}
      {tab === 'shell' && <ShellTerminal />}
    </div>
  )
}

function SystemMonitor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await api('/api/admin/system')
      if (res.success) setData(res.data)
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i) }, [])

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>
  if (!data) return <p className="text-red-400 text-center py-8">Failed to load system info</p>

  const Bar = ({ pct }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className="bg-primary-600 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">🧠 CPU</h3>
        <p className="text-2xl font-bold text-gray-800">{data.cpu.usage_percent}%</p>
        <Bar pct={data.cpu.usage_percent} />
        <p className="text-xs text-gray-400">{data.cpu.cores} cores</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">💾 Memory</h3>
        <p className="text-2xl font-bold text-gray-800">{data.memory.percent}%</p>
        <Bar pct={data.memory.percent} />
        <p className="text-xs text-gray-400">{data.memory.used_gb} GB / {data.memory.total_gb} GB</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">💿 Disk</h3>
        <p className="text-2xl font-bold text-gray-800">{data.disk.percent}%</p>
        <Bar pct={data.disk.percent} />
        <p className="text-xs text-gray-400">{data.disk.used_gb} GB / {data.disk.total_gb} GB</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700">⏱ Uptime</h3>
        <p className="text-2xl font-bold text-gray-800 mt-2">{data.uptime}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700">🐍 Python</h3>
        <p className="text-xs text-gray-500 mt-2 font-mono break-all">{data.python}</p>
      </div>
    </div>
  )
}

function LogViewer() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState(100)
  const [path, setPath] = useState('')

  const fetchLogs = async (n) => {
    setLoading(true)
    try {
      const res = await api(`/api/admin/logs?lines=${n}`)
      if (res.success) { setLogs(res.data.lines); setTotal(res.data.total); setPath(res.data.path) }
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs(lines) }, [lines])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{total} total lines · {path}</p>
        <select value={lines} onChange={e => setLines(Number(e.target.value))}
          className="rounded-lg border-gray-300 text-sm w-24">
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
        </select>
      </div>
      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No logs yet</p>
      ) : (
        <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto font-mono leading-relaxed">
          {logs.join('')}
        </pre>
      )}
    </div>
  )
}

function ModulesManager() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

  const fetchModules = async () => {
    setLoading(true)
    try {
      const res = await api('/api/admin/modules')
      if (res.success) setModules(res.data)
      else toast.error(res.error)
    } catch { toast.error('Failed to load modules') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchModules() }, [])

  const toggle = async (modId) => {
    setToggling(modId)
    try {
      const res = await api(`/api/admin/modules/${modId}/toggle`, { method: 'POST' })
      if (res.success) {
        setModules(m => m.map(x => x.id === modId ? { ...x, enabled: res.data.enabled } : x))
        toast.success(res.data.message)
      } else toast.error(res.error)
    } catch { toast.error('Toggle failed') }
    finally { setToggling(null) }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Enable or disable modules. Changes take effect after server restart.</p>
      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-6">Module</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-3"></div>
          </div>
          {modules.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
              <div className="col-span-6 text-sm font-medium">{m.name}</div>
              <div className="col-span-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {m.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="col-span-3 text-right">
                <button onClick={() => toggle(m.id)} disabled={toggling === m.id}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${m.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} disabled:opacity-50`}>
                  {toggling === m.id ? '...' : m.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(user.username)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user.role)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    const params = new URLSearchParams()
    if (username !== user.username) params.append('username', username)
    if (password) params.append('password', password)
    if (role !== user.role) params.append('role', role)
    if (![...params.keys()].length) { setEditing(false); setBusy(false); return }
    try {
      const res = await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: params })
      if (res.success) { toast.success('User updated'); setEditing(false); onUpdate() }
      else toast.error(res.error)
    } catch { toast.error('Update failed') }
    finally { setBusy(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete user "${user.username}" and all their files?`)) return
    try {
      const res = await api(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (res.success) { toast.success(res.data.message); onUpdate() }
      else toast.error(res.error)
    } catch { toast.error('Delete failed') }
  }

  if (editing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end px-4 py-3 bg-blue-50 border-b border-blue-200">
        <div className="md:col-span-3">
          <label className="block text-xs text-gray-500">Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            className="rounded-lg border-gray-300 text-sm w-full mt-0.5" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="rounded-lg border-gray-300 text-sm w-full mt-0.5" placeholder="Leave blank to keep" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="rounded-lg border-gray-300 text-sm w-full mt-0.5">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="md:col-span-5 flex gap-2 justify-end">
          <button onClick={save} disabled={busy}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs">Save</button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
      <div className="md:col-span-3 text-sm font-medium">{user.username}</div>
      <div className="md:col-span-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          {user.role}
        </span>
      </div>
      <div className="md:col-span-2 text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString()}</div>
      <div className="md:col-span-5 flex gap-2 justify-end flex-wrap">
        <button onClick={() => { setEditing(true); setUsername(user.username); setPassword(''); setRole(user.role) }}
          className="text-xs text-primary-600 hover:text-primary-800 font-medium">
          Edit
        </button>
        <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">
          Delete
        </button>
      </div>
      {/* Mobile meta */}
      <div className="md:hidden col-span-12 text-xs text-gray-400 -mt-1">
        Role: {user.role} · Created: {new Date(user.created_at).toLocaleDateString()}
      </div>
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

function ShellTerminal() {
  const [output, setOutput] = useState([{ type: 'info', data: 'Connecting...' }])
  const [cmd, setCmd] = useState('')
  const [ws, setWs] = useState(null)
  const [connected, setConnected] = useState(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('achus_token')
    if (!token) { setOutput([{ type: 'info', data: 'Not authenticated' }]); return }
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${proto}://${window.location.host}/api/admin/shell`)
    socket.onopen = () => {
      socket.send(JSON.stringify({ token }))
      setConnected(true)
    }
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      setOutput(prev => [...prev, msg])
    }
    socket.onclose = () => {
      setConnected(false)
      setOutput(prev => [...prev, { type: 'info', data: 'Disconnected' }])
    }
    socket.onerror = () => {
      setConnected(false)
      setOutput(prev => [...prev, { type: 'info', data: 'Connection error' }])
    }
    setWs(socket)
  }, [])

  useEffect(() => {
    connect()
    return () => { ws?.close() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  const sendCmd = () => {
    if (!cmd.trim() || !ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ cmd: cmd.trim() }))
    setOutput(prev => [...prev, { type: 'input', data: `$ ${cmd.trim()}` }])
    setCmd('')
  }

  const inputClasses = 'w-full bg-gray-900 text-green-300 border-0 outline-none font-mono text-sm p-0 caret-green-300'

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
        {!connected && (
          <button onClick={connect}
            className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs">Reconnect</button>
        )}
      </div>
      <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-300 min-h-[400px] max-h-[600px] overflow-y-auto flex flex-col">
        {output.map((line, i) => (
          <div key={i} className={`leading-relaxed whitespace-pre-wrap break-all ${line.type === 'stderr' ? 'text-red-400' : line.type === 'info' ? 'text-gray-400' : line.type === 'input' ? 'text-yellow-300' : ''}`}>
            {line.data}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-0 mt-0.5">
        <span className="text-green-300 font-mono text-sm bg-gray-900 px-3 py-2.5 rounded-l-lg border-r border-gray-700">$</span>
        <input ref={inputRef} value={cmd} onChange={e => setCmd(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendCmd() }}
          className={`${inputClasses} bg-gray-900 px-3 py-2.5 rounded-r-lg flex-1`}
          placeholder={connected ? 'Type a command...' : 'Not connected'}
          disabled={!connected} autoComplete="off" spellCheck={false} />
      </div>
    </div>
  )
}

export default AdminPage
