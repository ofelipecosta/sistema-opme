import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Eye, Edit2, AlertTriangle, FileText, ChevronDown } from 'lucide-react'
import { getRequisitions } from '../../utils/storage'
import { statusLabel, statusColor, formatDate } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import type { Requisition, RequisitionStatus, SurgeryType } from '../../types'

const STATUS_OPTIONS: RequisitionStatus[] = [
  'rascunho', 'enviada', 'em_analise', 'aprovada',
  'separacao_material', 'material_enviado', 'finalizada', 'cancelada'
]

export default function RequisitionList() {
  const navigate = useNavigate()
  const { user, isAdmin, canEdit } = useAuth()
  const [reqs, setReqs] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<RequisitionStatus | ''>('')
  const [filterTipo, setFilterTipo] = useState<SurgeryType | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRequisitions().then(data => {
      if (!cancelled) {
        setReqs(isAdmin ? data : data.filter(r => r.solicitanteId === user?.id))
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [isAdmin, user?.id])

  const filtered = useMemo(() => {
    return reqs.filter(r => {
      if (filterStatus && r.status !== filterStatus) return false
      if (filterTipo && r.tipoCirurgia !== filterTipo) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.numero.toLowerCase().includes(q) ||
          r.pacienteNome.toLowerCase().includes(q) ||
          r.hospitalNome.toLowerCase().includes(q) ||
          r.medicoNome.toLowerCase().includes(q) ||
          r.cirurgiaProcedimento.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [reqs, search, filterStatus, filterTipo])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por número, paciente, hospital, médico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {canEdit && (
            <button onClick={() => navigate('/requisicoes/nova')} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">Status</label>
            <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value as RequisitionStatus | '')}>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Tipo</label>
            <select className="input text-sm" value={filterTipo} onChange={e => setFilterTipo(e.target.value as SurgeryType | '')}>
              <option value="">Todos</option>
              <option value="eletiva">Eletiva</option>
              <option value="emergencia">Emergência</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <button
              onClick={() => { setFilterStatus(''); setFilterTipo(''); setSearch('') }}
              className="btn-secondary btn-sm w-full"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">{filtered.length} requisição(ões) encontrada(s)</p>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Nenhuma requisição encontrada</p>
          {canEdit && (
            <button onClick={() => navigate('/requisicoes/nova')} className="btn-primary">
              <Plus className="w-4 h-4" /> Criar Primeira Requisição
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Número</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Paciente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Hospital</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Médico</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Cirurgia</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.tipoCirurgia === 'emergencia' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.numero}</td>
                      <td className="px-4 py-3">
                        {r.tipoCirurgia === 'emergencia' ? (
                          <span className="flex items-center gap-1 text-red-700 font-medium text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" /> Emergência
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">Eletiva</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.pacienteNome || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{r.hospitalNome || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{r.medicoNome || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{r.cirurgiaData ? formatDate(r.cirurgiaData) : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/requisicoes/${r.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-700"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (isAdmin || r.solicitanteId === user?.id) && ['rascunho', 'enviada'].includes(r.status) && (
                            <button
                              onClick={() => navigate(`/requisicoes/${r.id}/editar`)}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-700"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/requisicoes/${r.id}`)}
                className={`card-hover w-full text-left p-4 ${r.tipoCirurgia === 'emergencia' ? 'border-red-200 bg-red-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs text-gray-500">{r.numero}</span>
                    {r.tipoCirurgia === 'emergencia' && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium emergency-pulse">
                        <AlertTriangle className="w-3 h-3" /> EMERGÊNCIA
                      </span>
                    )}
                  </div>
                  <span className={`badge ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                </div>
                <p className="font-semibold text-gray-800 text-sm">{r.pacienteNome || 'Paciente não informado'}</p>
                <p className="text-xs text-gray-500 mt-1">{r.hospitalNome} {r.hospitalCidade && `— ${r.hospitalCidade}`}</p>
                <p className="text-xs text-gray-500">{r.medicoNome}</p>
                {r.cirurgiaData && (
                  <p className="text-xs font-medium text-primary-600 mt-2">
                    Cirurgia: {formatDate(r.cirurgiaData)} {r.cirurgiaHorario}
                  </p>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
