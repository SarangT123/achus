import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import StatusBar from './components/StatusBar'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/Login'
import AdminPage from './pages/Admin'

const modules = import.meta.glob('./modules/*/index.jsx', { eager: true })

const moduleEntries = Object.entries(modules)
  .map(([path, mod]) => ({
    ...mod.default,
    Component: mod.default.component,
  }))
  .sort((a, b) => (a.order || 99) - (b.order || 99))

function AppContent() {
  const { user, loading } = useAuth()
  const [serverModules, setServerModules] = useState([])
  const [printerOnline, setPrinterOnline] = useState(false)
  const [healthOk, setHealthOk] = useState(true)

  useEffect(() => {
    if (!user) return

    fetch('/api/modules')
      .then(r => r.json())
      .then(res => { if (res.success) setServerModules(res.data) })
      .catch(() => setHealthOk(false))

    fetch('/api/health')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setPrinterOnline(res.data.printer_online)
          setHealthOk(true)
        }
      })
      .catch(() => setHealthOk(false))

    const interval = setInterval(() => {
      fetch('/api/health')
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            setPrinterOnline(res.data.printer_online)
            setHealthOk(true)
          }
        })
        .catch(() => setHealthOk(false))
    }, 15000)

    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const serverIds = new Set(serverModules.map(m => m.id))
  const enabledEntries = moduleEntries.filter(m => serverIds.has(m.id))

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <StatusBar printerOnline={printerOnline} healthOk={healthOk} />
        <Layout modules={enabledEntries}>
          <Routes>
            <Route path="/" element={
              <Dashboard modules={enabledEntries} serverModules={serverModules} />
            } />
            <Route path="/admin" element={
              <ErrorBoundary key="admin">
                <div className="p-4 md:p-8 max-w-5xl mx-auto">
                  <AdminPage />
                </div>
              </ErrorBoundary>
            } />
            {enabledEntries.map(m => (
              <Route
                key={m.id}
                path={`/${m.id}`}
                element={
                  <ErrorBoundary key={m.id}>
                    <div className="p-4 md:p-8 max-w-5xl mx-auto">
                      <m.Component />
                    </div>
                  </ErrorBoundary>
                }
              />
            ))}
          </Routes>
        </Layout>
      </div>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
