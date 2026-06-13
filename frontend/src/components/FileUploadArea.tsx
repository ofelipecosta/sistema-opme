import { useRef, useState } from 'react'
import { Paperclip, X, FileText, Image, AlertCircle } from 'lucide-react'

export interface PendingFile {
  id: string
  file: File
  preview?: string
}

interface Props {
  files: PendingFile[]
  onChange: (files: PendingFile[]) => void
  maxSizeMB?: number
  maxFiles?: number
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_EXT  = ['.pdf', '.jpg', '.jpeg', '.png', '.docx']

function fileIcon(tipo: string) {
  if (tipo.startsWith('image/')) return <Image className="w-4 h-4" />
  return <FileText className="w-4 h-4" />
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FileUploadArea({ files, onChange, maxSizeMB = 10, maxFiles = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return `Tipo não permitido: ${file.name}`
    if (file.size > maxSizeMB * 1024 * 1024) return `Arquivo muito grande: ${file.name} (máx. ${maxSizeMB} MB)`
    return null
  }

  function addFiles(newFiles: FileList | File[]) {
    setError(null)
    const arr = Array.from(newFiles)
    if (files.length + arr.length > maxFiles) {
      setError(`Máximo de ${maxFiles} arquivos permitidos`)
      return
    }
    const validated: PendingFile[] = []
    for (const file of arr) {
      const err = validate(file)
      if (err) { setError(err); return }
      const id = Math.random().toString(36).substr(2, 9)
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      validated.push({ id, file, preview })
    }
    onChange([...files, ...validated])
  }

  function remove(id: string) {
    const target = files.find(f => f.id === id)
    if (target?.preview) URL.revokeObjectURL(target.preview)
    onChange(files.filter(f => f.id !== id))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Paperclip className={`w-5 h-5 mx-auto mb-1.5 ${dragging ? 'text-primary-400' : 'text-slate-300'}`} />
        <p className="text-sm font-medium text-slate-500">
          {dragging ? 'Solte aqui' : 'Toque ou arraste os arquivos'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {ALLOWED_EXT.join(', ')} · máx. {maxSizeMB} MB cada
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXT.join(',')}
        className="hidden"
        onChange={e => { if (e.target.files) addFiles(e.target.files) }}
      />

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
              {f.preview ? (
                <img src={f.preview} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                  {fileIcon(f.file.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{f.file.name}</p>
                <p className="text-xs text-slate-400">{fmtSize(f.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
