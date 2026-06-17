import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import StatusBar from './components/StatusBar'
import ErrorBoundary from './components/ErrorBoundary'

const modules = import.meta.glob('./modules/*/index.jsx', { eager: true })

const moduleEntries = Object.entries(modules)
  .map(([path, mod]) => ({
    ...mod.default,
    Component: mod.default.component,
  }))
  .sort((a, b) => (a.order || 99) - (b.order || 99))

export default function App() {
  const [serverModules, setServerModules] = useState([])
  const [printerOnline, setPrinterOnline] = useState(false)
  const [healthOk, setHealthOk] = useState(true)

  useEffect(() => {
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
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <StatusBar printerOnline={printerOnline} healthOk={healthOk} />
        <Layout modules={moduleEntries}>
          <Routes>
            <Route path="/" element={
              <Dashboard modules={moduleEntries} serverModules={serverModules} />
            } />
            {moduleEntries.map(m => (
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
