import { useMemo, useState, useEffect, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileText,
  Building2, ArrowRight, Plus, CalendarClock,
  Stethoscope, ShieldCheck, Upload, User,
  CalendarDays, Package, AlertCircle, Timer,
} from 'lucide-react'
import { getRequisitions } from '../../utils/storage'
import { getAgenda } from '../../utils/agenda-storage'
import { getSeparacoes } from '../../utils/separacao-storage'
import { getHospitais } from '../../utils/cadastros-storage'
import { agendaStatusLabel, agendaStatusBg } from '../../utils/agenda-helpers'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import type { AgendaItem, AgendaStatus } from '../../types/agenda'
import type { SeparacaoRecord } from '../../types'
import type { Hospital } from '../../utils/cadastros-storage'

/* ─── Operational color palette ───────────────────────────────────── */
const C = {
  blue:   '#2563EB', green: '#16A34A', teal: '#0D9488',
  orange: '#F59E0B', red:   '#DC2626', purple: '#7C3AED',
  indigo: '#4F46E5', yellow: '#EAB308',
}

/* ─── Theme colors ─────────────────────────────────────────────────── */
function useT() {
  const { isDark } = useTheme()
  return {
    isDark,
    bg:        isDark ? '#111827' : 'transparent',
    card:      isDark ? '#1F2937' : 'rgba(255,255,255,0.92)',
    cardBorder:isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    text1:     isDark ? '#F3F4F6' : '#1D1D1F',
    text2:     isDark ? '#D1D5DB' : '#48484A',
    text3:     isDark ? '#9CA3AF' : '#8E8E93',
    divider:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    hover:     isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    inputBg:   isDark ? '#374151' : 'rgba(0,0,0,0.04)',
    shadow:    isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.05)',
  }
}

/* ─── Tag config ───────────────────────────────────────────────────── */
const TAGS: Record<string, { label: string; color: string; bg: string }> = {
  autorizada:        { label: 'Autorizada',        color: C.green,  bg: 'rgba(52,199,89,0.15)'  },
  emergencia:        { label: 'Emergência',         color: C.red,    bg: 'rgba(255,59,48,0.15)'  },
  material_separado: { label: 'Material Separado',  color: C.teal,   bg: 'rgba(0,199,190,0.15)'  },
  orcamento_pre:     { label: 'Orçamento Pré',      color: C.orange, bg: 'rgba(255,149,0,0.15)'  },
  cirurgia_faturada: { label: 'Faturada',           color: C.indigo, bg: 'rgba(88,86,214,0.15)'  },
}

function getTags(item: AgendaItem, isSeparated: boolean): string[] {
  const tags: string[] = []
  if (item.emergencia)                                   tags.push('emergencia')
  if (item.autorizada)                                   tags.push('autorizada')
  if (isSeparated)                                       tags.push('material_separado')
  if (item.status === 'orcamento_pre')                   tags.push('orcamento_pre')
  if (item.status === 'cirurgia_faturada')               tags.push('cirurgia_faturada')
  return tags
}

/* ─── Helpers ──────────────────────────────────────────────────────── */
function todayStr()    { return new Date().toISOString().split('T')[0] }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formattedDate() {
  const now = new Date()
  const weekdays = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${weekdays[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()} · ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function sortByTime(arr: AgendaItem[]) {
  return [...arr].sort((a, b) => `${a.data}${a.horaCirurgia}`.localeCompare(`${b.data}${b.horaCirurgia}`))
}

const isTerminal = (s: AgendaStatus) => ['cirurgia_finalizada','cirurgia_faturada','cancelada'].includes(s)

/**
 * Calculates the material delivery deadline for a surgery based on hospital rules.
 * Returns null if the hospital has no rule configured.
 *
 * Tipo A — antecedenciaMinHoras: X hours before surgery time
 * Tipo B — horarioLimiteRecebimento: fixed cutoff time on the day of surgery
 */
function calcDeadline(item: AgendaItem, hospital: Hospital | undefined): Date | null {
  if (!hospital || !item.data) return null

  if (hospital.horarioLimiteRecebimento) {
    // Fixed time on the surgery day (e.g., CHN: until 18:00 same day)
    const [h, m] = hospital.horarioLimiteRecebimento.split(':').map(Number)
    const d = new Date(`${item.data}T00:00:00`)
    d.setHours(h, m, 0, 0)
    return d
  }

  if (hospital.antecedenciaMinHoras) {
    // X hours before surgery time
    const time = item.horaCirurgia || '00:00'
    const [sh, sm] = time.split(':').map(Number)
    const surgery = new Date(`${item.data}T00:00:00`)
    surgery.setHours(sh, sm, 0, 0)
    return new Date(surgery.getTime() - hospital.antecedenciaMinHoras * 3600_000)
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SURGERY CARD                                                        */
/* ═══════════════════════════════════════════════════════════════════ */
function SurgeryCard({ item, isSeparated, showDate }: { item: AgendaItem; isSeparated: boolean; showDate?: boolean }) {
  const T = useT()
  const isEmg = !!item.emergencia
  const tags = getTags(item, isSeparated)
  const accentColor = isEmg ? C.red : item.autorizada ? C.green : C.blue

  return (
    <div style={{
      background: T.card,
      border: `1.5px solid ${isEmg ? 'rgba(255,59,48,0.25)' : T.cardBorder}`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: 14,
      boxShadow: T.shadow,
      overflow: 'hidden',
    }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 text-center min-w-[52px]">
            <p className="font-mono font-bold text-lg leading-none" style={{ color: isEmg ? C.red : C.blue }}>
              {item.horaCirurgia || '--:--'}
            </p>
            {showDate && item.data && (
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: T.text3 }}>
                {item.data.split('-').reverse().slice(0, 2).join('/')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {tags.map(t => (
              <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: TAGS[t].bg, color: TAGS[t].color }}>
                {TAGS[t].label}
              </span>
            ))}
            {!['orcamento_pre','cirurgia_faturada'].includes(item.status) && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agendaStatusBg(item.status)}`}>
                {agendaStatusLabel(item.status)}
              </span>
            )}
          </div>
        </div>

        <p className="font-bold text-sm mb-2 leading-tight" style={{ color: T.text1 }}>
          {item.paciente || item.procedimento || 'Cirurgia'}
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {item.hospital && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
              <Building2 size={11} style={{ flexShrink: 0, color: T.text3 }} />
              <span className="truncate" style={{ color: T.text2 }}>{item.hospital}</span>
            </span>
          )}
          {item.medico && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
              <Stethoscope size={11} style={{ flexShrink: 0, color: T.text3 }} />
              <span className="truncate" style={{ color: T.text2 }}>{item.medico}</span>
            </span>
          )}
          {item.convenio && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
              <ShieldCheck size={11} style={{ flexShrink: 0, color: T.text3 }} />
              <span className="truncate" style={{ color: T.text2 }}>{item.convenio}</span>
            </span>
          )}
          {item.vendedor && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
              <User size={11} style={{ flexShrink: 0, color: T.text3 }} />
              <span className="truncate font-medium" style={{ color: T.text2 }}>{item.vendedor}</span>
            </span>
          )}
          {item.procedimento && item.paciente && (
            <span className="flex items-center gap-1.5 text-xs col-span-2" style={{ color: T.text3 }}>
              <FileText size={11} style={{ flexShrink: 0, color: T.text3 }} />
              <span className="truncate" style={{ color: T.text2 }}>{item.procedimento}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  KPI GRID — unifica cards de totais + prioridades                    */
/* ═══════════════════════════════════════════════════════════════════ */
function KpiGrid({ agenda, separacoes, hospitais, hoje, total, finalizadas, navigate }: {
  agenda: AgendaItem[]
  separacoes: SeparacaoRecord[]
  hospitais: Hospital[]
  hoje: number
  total: number
  finalizadas: number
  navigate: (path: string) => void
}) {
  const now    = new Date()
  const sepIds = new Set(separacoes.flatMap(s => [s.reqId, `req_${s.reqId}`]))
  const hospMap = new Map(hospitais.map(h => [h.nome.toLowerCase(), h]))

  const active = agenda.filter(i => !isTerminal(i.status))

  let naoConcluidas = 0, criticas = 0, prox24h = 0, emDia = 0, pendentes = active.length

  for (const item of active) {
    const isSep = sepIds.has(item.id)
    if (isSep) { emDia++; continue }
    const hosp     = hospMap.get((item.hospital || '').toLowerCase())
    const deadline = calcDeadline(item, hosp)
    if (!deadline) continue
    const ms  = deadline.getTime() - now.getTime()
    const h4  = 4  * 3600_000
    const h24 = 24 * 3600_000
    if (ms < 0)   naoConcluidas++
    else if (ms < h4)  criticas++
    else if (ms < h24) prox24h++
  }

  const cards = [
    { icon: CalendarClock, label: 'Total',          value: total,         color: C.blue,    route: '/requisicoes', pulse: false,
      tooltip: 'Total de cirurgias cadastradas na agenda.' },
    { icon: Activity,      label: 'Hoje',           value: hoje,          color: C.green,   route: '/requisicoes', pulse: true,
      tooltip: 'Cirurgias agendadas para hoje.' },
    { icon: AlertCircle,   label: 'Não Concluídas', value: naoConcluidas, color: C.red,     route: '/separacao',   pulse: false,
      tooltip: 'Prazo de entrega de materiais já venceu e o material ainda não foi separado.' },
    { icon: Timer,         label: 'Críticas',       value: criticas,      color: C.orange,  route: '/separacao',   pulse: false,
      tooltip: 'Prazo de entrega vence em menos de 4 horas. Ação imediata necessária.' },
    { icon: Clock,         label: 'Próximas 24h',   value: prox24h,       color: '#EAB308', route: '/separacao',   pulse: false,
      tooltip: 'Prazo de entrega de materiais vence nas próximas 24 horas.' },
    { icon: CheckCircle2,  label: 'Em Dia',         value: emDia,         color: C.green,   route: '/separacao',   pulse: false,
      tooltip: 'Materiais já separados dentro do prazo.' },
    { icon: Package,       label: 'Pendentes',      value: pendentes,     color: C.purple,  route: '/requisicoes', pulse: false,
      tooltip: 'Total de cirurgias em aberto (aprovadas ou agendadas, ainda não finalizadas).' },
    { icon: CheckCircle2,  label: 'Finalizadas',    value: finalizadas,   color: C.teal,    route: '/requisicoes', pulse: false,
      tooltip: 'Cirurgias concluídas ou faturadas.' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(c => (
        <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value}
          color={c.color} pulse={c.pulse} tooltip={c.tooltip} onClick={() => navigate(c.route)} />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STAT CARD                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, color, pulse, active, onClick, tooltip }: {
  icon: ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string; value: number; color: string
  pulse?: boolean; active?: boolean; onClick?: () => void; tooltip?: string
}) {
  const T = useT()
  const [showTip, setShowTip] = useState(false)

  return (
    <div className="relative">
      <button type="button" onClick={onClick}
        onMouseEnter={() => tooltip && setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className="rounded-2xl p-4 text-left transition-all duration-150 w-full"
        style={{
          background: active ? `${color}18` : T.card,
          border: active ? `1.5px solid ${color}40` : `1px solid ${T.cardBorder}`,
          boxShadow: active ? `0 4px 20px ${color}20` : T.shadow,
          cursor: onClick ? 'pointer' : 'default',
          backdropFilter: 'blur(16px)',
        }}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}14` }}>
            <Icon size={15} style={{ color }} />
          </div>
          {pulse && !active && (
            <span className="w-2 h-2 rounded-full" style={{ background: color, animation: 'pulse 2s infinite', boxShadow: `0 0 6px ${color}` }} />
          )}
        </div>
        <p className="text-3xl font-bold leading-none mb-1.5" style={{ color: active ? color : T.text1 }}>{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: active ? color : T.text3 }}>{label}</p>
        <div className="h-0.5 rounded-full mt-2.5 transition-all duration-300"
          style={{ background: color, opacity: active ? 1 : 0.2, width: active ? '100%' : '24px' }} />
      </button>

      {showTip && tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 text-center pointer-events-none"
          style={{
            background: T.isDark ? '#1F2937' : '#1D1D1F',
            color: '#fff',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 12,
            lineHeight: '1.4',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}>
          {tooltip}
          <div className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
              borderTop: `6px solid ${T.isDark ? '#1F2937' : '#1D1D1F'}` }} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN DASHBOARD                                                       */
/* ═══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isAdmin, canEdit } = useAuth()
  const T = useT()

  const [reqs,      setReqs]      = useState<import('../../types').Requisition[]>([])
  const [agenda,    setAgenda]    = useState<AgendaItem[]>([])
  const [separacoes,setSeparacoes] = useState<SeparacaoRecord[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [showAll,   setShowAll]   = useState(false)
  const [showTomorrow, setShowTomorrow] = useState(false)

  useEffect(() => {
    getRequisitions().then(all => setReqs(isAdmin ? all : all.filter(r => r.solicitanteId === user?.id)))
    getAgenda().then(setAgenda)
    getSeparacoes().then(setSeparacoes)
    getHospitais().then(setHospitais).catch(() => {})
  }, [isAdmin, user?.id])

  const today    = todayStr()
  const tomorrow = tomorrowStr()

  const sepIds = useMemo(() => new Set(separacoes.flatMap(s => [s.reqId, `req_${s.reqId}`])), [separacoes])

  const todayItems    = useMemo(() => sortByTime(agenda.filter(i => i.data === today)),    [agenda, today])
  const tomorrowItems = useMemo(() => sortByTime(agenda.filter(i => i.data === tomorrow)), [agenda, tomorrow])
  const hasAgenda     = agenda.length > 0

  const agendaStats = useMemo(() => ({
    total:      agenda.length,
    hoje:       todayItems.length,
    pendentes:  agenda.filter(i => !isTerminal(i.status)).length,
    aguardSep:  agenda.filter(i => !isTerminal(i.status) && !sepIds.has(i.id) && i.data >= today).length,
    finalizadas:agenda.filter(i => isTerminal(i.status)).length,
  }), [agenda, todayItems, sepIds, today])

  const reqStats = useMemo(() => {
    const recent = [...reqs]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
    return { recent, total: reqs.length }
  }, [reqs])

  const mainItems = showAll
    ? sortByTime(agenda.filter(i => !['cancelada'].includes(i.status)))
    : showTomorrow ? tomorrowItems : todayItems

  const mainSubtitle = showAll
    ? `${agenda.length} no total`
    : showTomorrow
      ? `${tomorrowItems.length} cirurgia${tomorrowItems.length !== 1 ? 's' : ''}`
      : `${todayItems.length} cirurgia${todayItems.length !== 1 ? 's' : ''}`

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold leading-tight" style={{ color: T.text1 }}>
            {greeting()}, {user?.nome?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-xs mt-0.5" style={{ color: T.text3 }}>{formattedDate()}</p>
        </div>
        {(canEdit || isAdmin) && (
          <button onClick={() => navigate('/requisicoes/nova')} className="btn-primary flex-shrink-0">
            <Plus size={15} /> Nova Cirurgia
          </button>
        )}
      </div>

      {/* ── KPI + Prioridades unificados ── */}
      {hasAgenda ? (
        <KpiGrid agenda={agenda} separacoes={separacoes} hospitais={hospitais}
          hoje={agendaStats.hoje} total={agendaStats.total} finalizadas={agendaStats.finalizadas}
          navigate={navigate} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={FileText}      label="Total"       value={reqStats.total}                                                         color={C.blue}   />
          <StatCard icon={AlertTriangle} label="Emergências" value={reqs.filter(r=>r.tipoCirurgia==='emergencia').length}                   color={C.red}    />
          <StatCard icon={Clock}         label="Pendentes"   value={reqs.filter(r=>!['finalizada','cancelada'].includes(r.status)).length}  color={C.orange} />
          <StatCard icon={CheckCircle2}  label="Finalizadas" value={reqs.filter(r=>r.status==='finalizada').length}                        color={C.teal}   />
        </div>
      )}

      {/* ── Surgery list ── */}
      {hasAgenda ? (
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: `1px solid ${T.cardBorder}`, background: T.card }}>
              {[
                { label: `Hoje (${todayItems.length})`,     active: !showAll && !showTomorrow, onClick: () => { setShowAll(false); setShowTomorrow(false) } },
                { label: `Amanhã (${tomorrowItems.length})`,active: showTomorrow && !showAll,  onClick: () => { setShowAll(false); setShowTomorrow(true)  } },
                { label: 'Todas',                            active: showAll,                   onClick: () => { setShowAll(true);  setShowTomorrow(false) } },
              ].map(t => (
                <button key={t.label} onClick={t.onClick}
                  className="px-3 py-2 text-xs font-medium transition-all"
                  style={t.active ? { background: C.blue, color: '#fff' } : { color: T.text3 }}>
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${C.blue}12`, color: C.blue }}>
              {mainSubtitle}
            </p>
          </div>

          {mainItems.length === 0 ? (
            <div className="rounded-2xl py-16 text-center"
              style={{ background: T.card, border: `1px dashed ${T.cardBorder}` }}>
              <CalendarDays size={32} className="mx-auto mb-3" style={{ color: T.text3, opacity: 0.5 }} />
              <p className="font-semibold text-sm" style={{ color: T.text2 }}>
                {showTomorrow ? 'Nenhuma cirurgia amanhã' : showAll ? 'Nenhuma cirurgia na agenda' : 'Nenhuma cirurgia hoje'}
              </p>
              <p className="text-xs mt-1" style={{ color: T.text3 }}>Tente ver outro período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mainItems.map((item, i) => (
                <SurgeryCard key={item.id || i} item={item}
                  isSeparated={sepIds.has(item.id)}
                  showDate={showTomorrow || showAll} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3"
          style={{ background: T.card, border: `1px dashed ${T.cardBorder}`, boxShadow: T.shadow }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${C.blue}10` }}>
            <Upload size={20} style={{ color: C.blue }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: T.text2 }}>Nenhuma agenda importada</p>
            <p className="text-xs mt-1" style={{ color: T.text3 }}>Importe sua planilha para ver as cirurgias do dia aqui</p>
          </div>
          <button onClick={() => navigate('/importar')} className="btn-primary btn-sm mt-1">
            <Upload size={14} /> Importar Agenda
          </button>
        </div>
      )}

    </div>
  )
}
