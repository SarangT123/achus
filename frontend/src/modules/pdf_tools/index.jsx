import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

const tools = [
  { id: 'merge', name: 'Merge', icon: '📑', description: 'Combine multiple PDFs into one file' },
  { id: 'split', name: 'Split', icon: '✂️', description: 'Split a PDF at specific pages' },
  { id: 'compress', name: 'Compress', icon: '📦', description: 'Reduce PDF file size' },
  { id: 'convert', name: 'Convert', icon: '🔄', description: 'Convert between PDF, Word, Image, and more' },
  { id: 'rotate', name: 'Rotate', icon: '🔄', description: 'Rotate pages in a PDF' },
  { id: 'extract', name: 'Extract', icon: '📋', description: 'Extract specific pages' },
  { id: 'watermark', name: 'Watermark', icon: '💧', description: 'Add text or image watermark' },
  { id: 'page-numbers', name: 'Page Numbers', icon: '🔢', description: 'Add page numbers to PDF' },
  { id: 'reorder', name: 'Reorder', icon: '🔀', description: 'Rearrange or delete pages' },
  { id: 'ocr', name: 'OCR', icon: '🔍', description: 'Recognize text in scanned PDFs' },
  { id: 'encrypt', name: 'Encrypt', icon: '🔒', description: 'Add password protection' },
]

const toolColors = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
]

function PdfToolsModule() {
  const [selectedTool, setSelectedTool] = useState(null)

  if (selectedTool) {
    return (
      <div>
        <button
          onClick={() => setSelectedTool(null)}
          className="text-sm text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-1"
        >
          ← Back to tools
        </button>
        <h3 className="text-xl font-bold mb-4">{tools.find(t => t.id === selectedTool)?.name}</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700 font-medium">Coming in Phase 2</p>
          <p className="text-yellow-600 text-sm mt-1">This tool will be fully functional in the next update.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">PDF Tools</h2>
      <p className="text-gray-500 mb-6">Full iLovePDF-equivalent suite — all processing happens locally on your laptop.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {tools.map((tool, idx) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`p-4 rounded-xl border text-left hover:shadow-md transition-shadow ${
              toolColors[idx % toolColors.length]
            }`}
          >
            <span className="text-2xl block mb-2">{tool.icon}</span>
            <h4 className="font-semibold text-sm">{tool.name}</h4>
            <p className="text-xs opacity-75 mt-0.5 line-clamp-2">{tool.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default {
  id: 'pdf-tools',
  name: 'PDF Tools',
  icon: 'file-pdf',
  component: PdfToolsModule,
  order: 2,
}
