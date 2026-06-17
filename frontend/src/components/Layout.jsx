import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const iconMap = {
  printer: '🖨️',
  'file-pdf': '📄',
  compress: '📦',
  poster: '🎨',
  magic: '✨',
  cloud: '☁️',
  box: '📁',
}

export default function Layout({ children, modules }) {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
  }

  return (
    <div className="flex flex-1">
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around px-2 py-1 safe-area-pb">
        <NavLink to="/" end
          className={({ isActive }) => `flex flex-col items-center px-3 py-2 text-xs rounded-lg ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-500'}`}
        >
          <span className="text-lg">🏠</span>
          <span>Home</span>
        </NavLink>
        {modules.slice(0, 4).map(m => (
          <NavLink key={m.id} to={`/${m.id}`}
            className={({ isActive }) => `flex flex-col items-center px-3 py-2 text-xs rounded-lg ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-500'}`}
          >
            <span className="text-lg">{iconMap[m.icon] || '📁'}</span>
            <span className="truncate max-w-12">{m.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:border-r md:border-gray-200 md:bg-white md:min-h-[calc(100vh-36px)]">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">ACHUS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Multi-Tool Home Lab</p>
        </div>

        {user && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-gray-700">{user.username}</p>
            {user.role === 'admin' && (
              <NavLink to="/admin" className="text-xs text-primary-600 hover:underline mt-0.5 inline-block">
                ⚙ Admin Panel
              </NavLink>
            )}
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLink to="/" end
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <span className="text-lg">🏠</span>
            Dashboard
          </NavLink>
          {modules.map(m => (
            <NavLink key={m.id} to={`/${m.id}`}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}
            >
              <span className="text-lg">{iconMap[m.icon] || '📁'}</span>
              <span className="truncate">{m.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {user && (
            <button onClick={handleLogout}
              className="w-full text-xs text-gray-400 hover:text-red-500 text-center transition-colors">
              Sign out
            </button>
          )}
          <p className="text-[10px] text-gray-400 text-center">ACHUS v0.1</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0 min-h-[calc(100vh-36px)]">
        {children}
      </main>
    </div>
  )
}
