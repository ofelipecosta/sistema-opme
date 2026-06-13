import { CheckSquare, Square, Package2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { KitItem } from '../utils/cadastros-storage'

interface Props {
  procedimentoNome: string
  items: KitItem[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
}

export default function KitChecklist({ procedimentoNome, items, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState(true)

  if (!items.length) return null

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  function toggleAll() {
    if (selected.size === items.length) {
      onChange(new Set())
    } else {
      onChange(new Set(items.map(i => i.id)))
    }
  }

  const allSelected = selected.size === items.length
  const count = selected.size

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2.5 w-full px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <Package2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-700">Kit sugerido</span>
          <span className="ml-2 text-xs text-slate-400">{procedimentoNome}</span>
        </div>
        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
          {count}/{items.length}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div>
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            {allSelected
              ? <CheckSquare className="w-3.5 h-3.5 text-primary-500" />
              : <Square className="w-3.5 h-3.5 text-slate-300" />}
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>

          <div className="divide-y divide-slate-50">
            {items.map(item => {
              const checked = selected.has(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`flex-shrink-0 transition-colors ${checked ? 'text-primary-500' : 'text-slate-300'}`}>
                    {checked
                      ? <CheckSquare className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                      : <Square className="w-[18px] h-[18px]" />}
                  </div>
                  <span className={`text-sm transition-colors ${checked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                    {item.nome}
                  </span>
                </button>
              )
            })}
          </div>

          {count > 0 && (
            <div className="px-4 py-2.5 bg-primary-50 border-t border-primary-100">
              <p className="text-xs text-primary-700 font-medium">
                {count} {count === 1 ? 'item selecionado' : 'itens selecionados'} — serão adicionados à solicitação
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
