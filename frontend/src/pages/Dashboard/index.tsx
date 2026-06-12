import { useMemo, useState, useEffect, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileText,
  Building2, TrendingUp, ArrowRight, Plus,
  CalendarClock, Stethoscope, ShieldCheck, Upload, X, User,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getRequisitions } from '../../utils/storage'
import { getAgenda } from '../../utils/agenda-storage'
import { agendaStatusLabel, agendaStatusBg } from '../../utils/agenda-helpers'
import { statusLabel, statusColor, formatDate } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import type { RequisitionStatus } from '../../types'
import type { AgendaItem } from '../../types/agenda'

/* ─── Apple system colors ───────────────────────────────── */
const A = {
  blue:   '#007AFF',
  green:  '#34C759',
  teal:   '#00C7BE',
  orange: '#FF9500',
  red:    '#FF3B30',
  purple: '#AF52DE',
  indigo: '#5856D6',
  gray1:  '#1D1D1F',
  gray2:  '#48484A',
  gray3:  '#8E8E93',
  gray4:  '#AEAEB2',
  gray5:  '#D1D1D6',
  gray6:  '#F2F2F7',
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: '#C7C7CC', enviada: A.blue, em_analise: A.orange,
  aprovada: A.green, separacao_material: A.purple,
  material_enviado: A.indigo, finalizada: A.teal, cancelada: A.red,
}

type FilterKey = 'all' | 'hoje' | 'autorizadas' | 'pendentes' | 'finalizadas'

const FILTER_LABELS: Record<FilterKey, string> = {
  all:         'Agenda Completa',
  hoje:        'Cirurgias de Hoje',
  autorizadas: 'Autorizadas',
  pendentes:   'Pendentes',
  finalizadas: 'Finalizadas',
}

function todayStr()    { return new Date().toISOString().split('T')[0] }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isAdmin, canEdit } = useAuth()
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [reqs, setReqs] = useState<import('../../types').Requisition[]>([])
  const [agenda, setAgenda] = useState<AgendaItem[]>([])

  useEffect(() => {
    getRequisitions().then(all => setReqs(isAdmin ? all : all.filter(r => r.solicitanteId === user?.id)))
    getAgenda().then(setAgenda)
  }, [isAdmin, user?.id])

  const agendaStats = useMemo(() => {
    const today    = todayStr()
    const tomorrow = tomorrowStr()
    const sort = (arr: AgendaItem[]) =>
      arr.sort((a, b) => `${a.data}${a.horaCirurgia}`.localeCompare(`${b.data}${b.horaCirurgia}`))

    const todayItems      = sort(agenda.filter(i => i.data === today))
    const tomorrowItems   = sort(agenda.filter(i => i.data === tomorrow))
    const autorizadasItems= sort(agenda.filter(i => i.autorizada && !['cancelada','cirurgia_faturada','cirurgia_finalizada'].includes(i.status)))
    const pendentesItems  = sort(agenda.filter(i => !['cirurgia_finalizada','cirurgia_faturada','cancelada'].includes(i.status)))
    const finalizadasItems= sort(agenda.filter(i => ['cirurgia_finalizada','cirurgia_faturada'].includes(i.status)))

    const hospMap = agenda.reduce((acc, i) => {
      if (i.hospital) acc[i.hospital] = (acc[i.hospital] || 0) + 1; return acc
    }, {} as Record<string, number>)
    const topHospitals = Object.entries(hospMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([nome, total]) => ({ nome: nome.length > 22 ? nome.slice(0, 22) + '…' : nome, total }))

    return {
      todayItems, tomorrowItems, autorizadasItems, pendentesItems, finalizadasItems, topHospitals,
      total:       agenda.length,
      autorizadas: autorizadasItems.length,
      pendentes:   pendentesItems.length,
      finalizadas: finalizadasItems.length,
    }
  }, [agenda])

  const reqStats = useMemo(() => {
    const total      = reqs.length
    const pendentes  = reqs.filter(r => !['finalizada', 'cancelada'].includes(r.status)).length
    const emergencias= reqs.filter(r => r.tipoCirurgia === 'emergencia').length
    const statusDist = Object.entries(
      reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {} as Record<string, number>)
    ).map(([status, total]) => ({ status, total, label: statusLabel(status as RequisitionStatus) }))
    const recent = [...reqs]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
    return { total, pendentes, emergencias, statusDist, recent }
  }, [reqs])

  const filteredAgendaItems = useMemo((): AgendaItem[] | null => {
    if (!activeFilter) return null
    switch (activeFilter) {
      case 'hoje':        return agendaStats.todayItems
      case 'autorizadas': return agendaStats.autorizadasItems
      case 'pendentes':   return agendaStats.pendentesItems
      case 'finalizadas': return agendaStats.finalizadasItems
      case 'all':         return [...agenda].sort((a,b) => `${a.data}${a.horaCirurgia}`.localeCompare(`${b.data}${b.horaCirurgia}`))
      default:            return null
    }
  }, [activeFilter, agendaStats, agenda])

  function toggleFilter(key: FilterKey) {
    setActiveFilter(prev => prev === key ? null : key)
  }

  const hasAgenda = agenda.length > 0

  return (
    <div className="space-y-5 p-0">

      {/* ══ KPI STRIP ══ */}
      {hasAgenda ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={CalendarClock} label="Total"       value={agendaStats.total}             color={A.blue}   active={activeFilter==='all'}         onClick={() => toggleFilter('all')} />
          <StatCard icon={Activity}      label="Hoje"        value={agendaStats.todayItems.length}  color={A.green}  active={activeFilter==='hoje'}        onClick={() => toggleFilter('hoje')} pulse={!activeFilter} />
          <StatCard icon={ShieldCheck}   label="Autorizadas" value={agendaStats.autorizadas}        color={A.teal}   active={activeFilter==='autorizadas'} onClick={() => toggleFilter('autorizadas')} />
          <StatCard icon={Clock}         label="Pendentes"   value={agendaStats.pendentes}           color={A.orange} active={activeFilter==='pendentes'}   onClick={() => toggleFilter('pendentes')} />
          <StatCard icon={CheckCircle2}  label="Finalizadas" value={agendaStats.finalizadas}         color={A.indigo} active={activeFilter==='finalizadas'} onClick={() => toggleFilter('finalizadas')} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={FileText}      label="Total"       value={reqStats.total}                                    color={A.blue}   />
          <StatCard icon={AlertTriangle} label="Emergências" value={reqStats.emergencias}                              color={A.red}    />
          <StatCard icon={Clock}         label="Pendentes"   value={reqStats.pendentes}                                color={A.orange} />
          <StatCard icon={CheckCircle2}  label="Finalizadas" value={reqs.filter(r=>r.status==='finalizada').length}    color={A.teal}   />
          <StatCard icon={Activity}      label="Eletivas"    value={reqs.filter(r=>r.tipoCirurgia==='eletiva').length} color={A.green}  />
        </div>
      )}

      {/* ══ FILTERED VIEW ══ */}
      {hasAgenda && activeFilter && filteredAgendaItems !== null && (
        <AgendaCard
          title={FILTER_LABELS[activeFilter]}
          count={filteredAgendaItems.length}
          items={filteredAgendaItems}
          showDate={activeFilter !== 'hoje'}
          onClose={() => setActiveFilter(null)}
          accentColor={A.blue}
        />
      )}

      {/* ══ HOJE (default) ══ */}
      {hasAgenda && !activeFilter && agendaStats.todayItems.length > 0 && (
        <AgendaCard
          title="Cirurgias de Hoje"
          count={agendaStats.todayItems.length}
          items={agendaStats.todayItems}
          accentColor={A.green}
          pulse
        />
      )}

      {/* ══ AMANHÃ (default) ══ */}
      {hasAgenda && !activeFilter && agendaStats.tomorrowItems.length > 0 && (
        <AgendaCard
          title="Amanhã"
          count={agendaStats.tomorrowItems.length}
          items={agendaStats.tomorrowItems}
          showDate
          accentColor={A.blue}
          icon={<CalendarClock size={15} style={{ color: A.blue }} />}
        />
      )}

      {/* ══ NO AGENDA ══ */}
      {!hasAgenda && (
        <div className="rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3"
          style={{ background: 'rgba(255,255,255,0.80)', border: '1px dashed rgba(0,0,0,0.12)', backdropFilter: 'blur(16px)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.04)' }}>
            <Upload size={20} style={{ color: A.gray4 }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: A.gray2 }}>Nenhuma agenda importada</p>
            <p className="text-xs mt-1" style={{ color: A.gray3 }}>Importe sua planilha para ver as cirurgias do dia aqui</p>
          </div>
          <button onClick={() => navigate('/importar')}
            className="btn-primary btn-sm mt-1">
            <Upload size={14} /> Importar Agenda
          </button>
        </div>
      )}

      {/* ══ CHARTS (admin) ══ */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {hasAgenda && agendaStats.topHospitals.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(16px)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: A.gray1 }}>
                <Building2 size={15} style={{ color: A.blue }} />
                Top Hospitais — Agenda
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agendaStats.topHospitals} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: A.gray3 }} />
                  <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 10, fill: A.gray2 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12, fontFamily: '-apple-system' }} />
                  <Bar dataKey="total" fill={A.blue} radius={[0, 6, 6, 0]} name="Cirurgias" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {reqStats.statusDist.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(16px)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: A.gray1 }}>
                <TrendingUp size={15} style={{ color: A.blue }} />
                Requisições por Status
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={reqStats.statusDist} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={78} innerRadius={38}>
                    {reqStats.statusDist.map(entry => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || A.gray4} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══ RECENT REQS ══ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(16px)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: A.gray1 }}>
            <FileText size={15} style={{ color: A.blue }} />
            Agendamentos Recentes
          </h3>
          <button onClick={() => navigate('/requisicoes')}
            className="text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: A.blue }}>
            Ver todos <ArrowRight size={12} />
          </button>
        </div>

        {reqStats.recent.length === 0 ? (
          <div className="text-center py-10">
            <FileText size={32} className="mx-auto mb-2" style={{ color: A.gray5 }} />
            <p className="text-sm" style={{ color: A.gray3 }}>Nenhum agendamento</p>
            {canEdit && (
              <button onClick={() => navigate('/requisicoes/nova')} className="btn-primary btn-sm mt-3">
                <Plus size={14} /> Novo Agendamento
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
            {reqStats.recent.map(r => (
              <button key={r.id} onClick={() => navigate(`/requisicoes/${r.id}`)}
                className="w-full text-left px-4 py-3.5 transition-colors hover:bg-black/[0.02]">
                <div className="flex items-center gap-3">
                  {/* Left: type indicator */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: r.tipoCirurgia === 'emergencia' ? 'rgba(255,59,48,0.10)' : 'rgba(0,122,255,0.08)' }}>
                    {r.tipoCirurgia === 'emergencia'
                      ? <AlertTriangle size={14} style={{ color: A.red }} />
                      : <FileText size={14} style={{ color: A.blue }} />}
                  </div>
                  {/* Center info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-mono" style={{ color: A.gray3 }}>{r.numero}</span>
                      {r.tipoCirurgia === 'emergencia' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: A.red, color: '#fff' }}>EMERG</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: A.gray1 }}>
                      {r.pacienteNome || 'Paciente não informado'}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: A.gray3 }}>
                      {r.hospitalNome}{r.cirurgiaData ? ` · ${formatDate(r.cirurgiaData)}` : ''}
                    </p>
                  </div>
                  {/* Right: status */}
                  <span className={`badge flex-shrink-0 text-xs ${statusColor(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══ AgendaCard ══════════════════════════════════════════════════════ */
function AgendaCard({
  title, count, items, showDate, onClose, accentColor, pulse, icon,
}: {
  title: string; count: number; items: AgendaItem[]
  showDate?: boolean; onClose?: () => void
  accentColor: string; pulse?: boolean; icon?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(16px)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: A.gray1 }}>
          {icon ?? (
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: accentColor, boxShadow: pulse ? `0 0 6px ${accentColor}` : undefined,
                animation: pulse ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined }} />
          )}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${accentColor}12`, color: accentColor }}>
            {count} {count === 1 ? 'cirurgia' : 'cirurgias'}
          </span>
          {onClose && (
            <button onClick={onClose}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: A.gray3 }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm" style={{ color: A.gray3 }}>Nenhuma cirurgia encontrada</div>
      ) : (
        <div className="divide-y max-h-[540px] overflow-y-auto" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
          {items.map((item, idx) => (
            <AgendaRow key={item.id || idx} item={item} showDate={showDate} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ══ AgendaRow ═══════════════════════════════════════════════════════ */
function AgendaRow({ item, showDate }: { item: AgendaItem; showDate?: boolean }) {
  const isEmg = !!item.emergencia
  return (
    <div className="px-4 py-3 transition-colors hover:bg-black/[0.02]"
      style={isEmg ? { background: 'rgba(255,59,48,0.03)' } : undefined}>

      {/* ── Desktop layout ── */}
      <div className="hidden sm:flex items-center gap-4">

        {/* Time block */}
        <div className="w-14 flex-shrink-0 text-center">
          <p className="font-mono font-bold leading-none" style={{ fontSize: 17, color: isEmg ? A.red : A.blue }}>
            {item.horaCirurgia || '--:--'}
          </p>
          {showDate && item.data && (
            <p className="text-[10px] mt-0.5" style={{ color: A.gray3 }}>
              {item.data.split('-').reverse().slice(0, 2).join('/')}
            </p>
          )}
          {isEmg && <p className="text-[9px] font-bold mt-1" style={{ color: A.red }}>⚠ EMERG</p>}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold" style={{ color: A.gray1 }}>
              {item.paciente || item.procedimento || 'Cirurgia'}
            </p>
            <span className={`badge text-xs ${agendaStatusBg(item.status)}`}>
              {agendaStatusLabel(item.status)}
            </span>
            {item.autorizada && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,199,89,0.12)', color: A.green }}>✓ Autorizada</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: A.gray3 }}>
            {item.hospital    && <span className="flex items-center gap-0.5"><Building2 size={11} />{item.hospital}</span>}
            {item.medico      && <span className="flex items-center gap-0.5"><Stethoscope size={11} />{item.medico}</span>}
            {item.convenio    && <span>{item.convenio}</span>}
            {item.procedimento && item.paciente && (
              <span className="font-medium" style={{ color: A.gray2 }}>{item.procedimento}</span>
            )}
          </div>
        </div>

        {/* Vendor — full name, no truncation */}
        {item.vendedor && (
          <div className="flex-shrink-0 text-right pl-2 max-w-[120px]">
            <p className="text-[10px] mb-0.5" style={{ color: A.gray4 }}>Vendedor</p>
            <p className="text-xs font-semibold leading-snug" style={{ color: A.gray2, wordBreak: 'break-word' }}>
              {item.vendedor}
            </p>
          </div>
        )}
      </div>

      {/* ── Mobile layout ── */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Time pill */}
            <div className="flex-shrink-0 px-2.5 py-1 rounded-xl text-xs font-mono font-bold"
              style={{ background: isEmg ? 'rgba(255,59,48,0.10)' : 'rgba(0,122,255,0.08)', color: isEmg ? A.red : A.blue }}>
              {item.horaCirurgia || '--:--'}
              {showDate && item.data && (
                <span className="block text-[9px] font-normal text-center mt-0.5" style={{ color: A.gray3 }}>
                  {item.data.split('-').reverse().slice(0, 2).join('/')}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: A.gray1 }}>
                {item.paciente || item.procedimento || 'Cirurgia'}
              </p>
              {item.procedimento && item.paciente && (
                <p className="text-xs mt-0.5" style={{ color: A.gray3 }}>{item.procedimento}</p>
              )}
            </div>
          </div>
          <span className={`badge text-xs flex-shrink-0 ${agendaStatusBg(item.status)}`}>
            {agendaStatusLabel(item.status)}
          </span>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs pl-1" style={{ color: A.gray3 }}>
          {item.hospital && (
            <span className="flex items-center gap-1">
              <Building2 size={11} style={{ flexShrink: 0 }} />
              <span className="break-words">{item.hospital}</span>
            </span>
          )}
          {item.medico && (
            <span className="flex items-center gap-1">
              <Stethoscope size={11} style={{ flexShrink: 0 }} />
              {item.medico}
            </span>
          )}
          {item.vendedor && (
            <span className="flex items-center gap-1">
              <User size={11} style={{ flexShrink: 0 }} />
              <span style={{ color: A.gray2, fontWeight: 600 }}>{item.vendedor}</span>
            </span>
          )}
          {item.convenio && <span>{item.convenio}</span>}
        </div>

        {item.autorizada && (
          <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(52,199,89,0.12)', color: A.green }}>✓ Autorizada</span>
        )}
      </div>
    </div>
  )
}

/* ══ StatCard ════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, color, pulse, active, onClick }: {
  icon: ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string; value: number; color: string
  pulse?: boolean; active?: boolean; onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-2xl p-4 text-left transition-all duration-150 w-full"
      style={{
        background: active ? `${color}12` : 'rgba(255,255,255,0.88)',
        border: active ? `1.5px solid ${color}40` : '1px solid rgba(0,0,0,0.06)',
        backdropFilter: 'blur(16px)',
        boxShadow: active ? `0 4px 20px ${color}20` : '0 2px 8px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
      }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}14` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {pulse && !active && (
          <span className="w-2 h-2 rounded-full" style={{ background: color, animation: 'pulse 2s infinite', boxShadow: `0 0 6px ${color}` }} />
        )}
      </div>
      <p className="text-3xl font-bold leading-none mb-1.5" style={{ color: active ? color : A.gray1 }}>{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: active ? color : A.gray3 }}>{label}</p>
      <div className="h-0.5 rounded-full mt-2.5 transition-all duration-300"
        style={{ background: color, opacity: active ? 1 : 0.2, width: active ? '100%' : '24px' }} />
    </button>
  )
}
