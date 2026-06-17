import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage({ onClose }) {
  const { login, register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { toast.error('Fill in all fields'); return }
    setBusy(true)
    try {
      if (isRegister) await register(username, password)
      else await login(username, password)
      toast.success(isRegister ? 'Account created!' : 'Welcome back!')
      if (onClose) onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">ACHUS</h1>
          <p className="text-gray-400 text-sm mt-1">Multi-Tool Home Lab</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">{isRegister ? 'Create Account' : 'Sign In'}</h2>
          <input
            type="text" placeholder="Username" value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm"
            autoFocus
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm"
          />
          <button type="submit" disabled={busy}
            className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? 'Please wait...' : isRegister ? 'Register' : 'Sign In'}
          </button>
          <p className="text-xs text-center text-gray-400">
            {isRegister ? (
              <>Already have an account? <button type="button" onClick={() => setIsRegister(false)} className="text-primary-600 underline">Sign in</button></>
            ) : (
              <>Don't have one? <button type="button" onClick={() => setIsRegister(true)} className="text-primary-600 underline">Register here</button> or use <strong>admin / admin</strong></>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
