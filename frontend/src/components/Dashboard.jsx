import { useNavigate } from 'react-router-dom'

const iconMap = {
  printer: '🖨️',
  'file-pdf': '📄',
  compress: '📦',
  poster: '🎨',
  magic: '✨',
  cloud: '☁️',
  box: '📁',
}

const bgColors = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
]

export default function Dashboard({ modules, serverModules }) {
  const navigate = useNavigate()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 mt-1 text-sm md:text-base">
          {serverModules.length} modules available — select one to get started
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {modules.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => navigate(`/${m.id}`)}
            className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <div className={`h-2 bg-gradient-to-r ${bgColors[idx % bgColors.length]}`} />
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{iconMap[m.icon] || '📁'}</span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-full">
                  Module {m.order}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{m.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {m.description}
              </p>
            </div>
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary-200 rounded-2xl transition-colors pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  )
}
