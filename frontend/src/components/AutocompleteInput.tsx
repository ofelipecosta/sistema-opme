import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, Check, X } from 'lucide-react'

export interface AutocompleteOption {
  id: string
  nome: string
  sub?: string
}

interface Props {
  value: string
  onChange: (val: string) => void
  onSelect?: (opt: AutocompleteOption) => void
  options: AutocompleteOption[]
  placeholder?: string
  className?: string
  inputClassName?: string
  allowCreate?: boolean
  onCreateNew?: (nome: string) => Promise<AutocompleteOption | null>
  disabled?: boolean
  uppercase?: boolean
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder = 'Buscar...',
  inputClassName = '',
  allowCreate = true,
  onCreateNew,
  disabled = false,
  uppercase = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter(o =>
    o.nome.toLowerCase().includes((value || '').toLowerCase().trim())
  ).slice(0, 8)

  const hasExactMatch = options.some(o => o.nome.toLowerCase() === (value || '').toLowerCase().trim())
  const showCreate = allowCreate && onCreateNew && value.trim().length > 1 && !hasExactMatch

  function calcPos() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      const inContainer = containerRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inContainer && !inDropdown) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    function onScroll() { if (open) calcPos() }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = uppercase ? e.target.value.toUpperCase() : e.target.value
    onChange(v)
    calcPos()
    setOpen(true)
    setActiveIdx(-1)
  }, [onChange, uppercase])

  function handleFocus() {
    calcPos()
    setOpen(true)
  }

  function handleSelect(opt: AutocompleteOption) {
    onChange(opt.nome)
    onSelect?.(opt)
    setOpen(false)
    setActiveIdx(-1)
  }

  async function handleCreate() {
    if (!onCreateNew || !value.trim()) return
    setCreating(true)
    try {
      const created = await onCreateNew(value.trim())
      if (created) handleSelect(created)
    } finally {
      setCreating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const total = filtered.length + (showCreate ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        handleSelect(filtered[activeIdx])
      } else if (activeIdx === filtered.length && showCreate) {
        handleCreate()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInput}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`mobile-input pr-6 ${inputClassName}`}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{ textTransform: uppercase ? 'uppercase' : undefined }}
        />
        {value ? (
          <button
            type="button"
            className="absolute right-0 p-1 text-slate-300 hover:text-slate-500 transition-colors"
            onClick={() => { onChange(''); onSelect?.({ id: '', nome: '' }); inputRef.current?.focus() }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Search className="absolute right-0 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
        )}
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            maxHeight: 260,
            overflowY: 'auto',
          }}
          className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
        >
          {filtered.map((opt, i) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors"
              style={{ background: activeIdx === i ? '#F1F5F9' : undefined }}
            >
              <div className="w-5 h-5 rounded-md bg-primary-50 flex items-center justify-center flex-shrink-0">
                {value && opt.nome.toLowerCase() === value.toLowerCase()
                  ? <Check className="w-3 h-3 text-primary-600" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-primary-300" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{opt.nome}</p>
                {opt.sub && <p className="text-xs text-slate-400 truncate">{opt.sub}</p>}
              </div>
            </button>
          ))}

          {showCreate && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleCreate() }}
              disabled={creating}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left border-t border-slate-100 hover:bg-blue-50 transition-colors"
              style={{ background: activeIdx === filtered.length ? '#EFF6FF' : undefined }}
            >
              <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  {creating ? 'Cadastrando...' : `Cadastrar "${value.trim()}"`}
                </p>
                <p className="text-xs text-blue-400">Salvar no sistema</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
