import { useState, useEffect } from 'react'

const statusIcons = {
  healthy: '●',
  warning: '●',
  error: '●',
}

export default function StatusBar({ printerOnline, healthOk }) {
  const [networkOk, setNetworkOk] = useState(true)
  const [serverInfo, setServerInfo] = useState(null)

  useEffect(() => {
    const checkNetwork = () => setNetworkOk(navigator.onLine)
    checkNetwork()
    window.addEventListener('online', checkNetwork)
    window.addEventListener('offline', checkNetwork)

    fetch('/api/health')
      .then(r => r.json())
      .then(res => { if (res.success) setServerInfo(res.data) })
      .catch(() => {})

    return () => {
      window.removeEventListener('online', checkNetwork)
      window.removeEventListener('offline', checkNetwork)
    }
  }, [])

  if (!healthOk) {
    return (
      <div className="bg-red-500 text-white text-xs md:text-sm px-4 py-1.5 flex items-center justify-center gap-2">
        <span className="animate-pulse">{statusIcons.error}</span>
        <span>Server unreachable — is the backend running?</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 text-gray-200 text-xs md:text-sm px-4 py-1.5 flex items-center justify-between flex-wrap gap-x-4">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${printerOnline ? 'bg-green-400' : 'bg-yellow-400'}`} />
          Printer {printerOnline ? 'Online' : 'Offline'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${networkOk ? 'bg-green-400' : 'bg-red-400'}`} />
          Network {networkOk ? 'Connected' : 'Offline'}
        </span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {serverInfo && (
          <span className="text-gray-400">
            {serverInfo.modules_count} modules loaded
          </span>
        )}
        <span className="text-gray-500">ACHUS v0.1</span>
      </div>
    </div>
  )
}
