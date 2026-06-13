import { useMemo, useState, useEffect, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileText,
  Building2, TrendingUp, ArrowRight, Plus, CalendarClock,
  Stethoscope, ShieldCheck, Upload, X, User, ClipboardList,
  Layers, Zap, XCircle, CalendarDays, Package, AlertCircle,
  ChevronRight, Moon, Sun,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getRequisitions } from '../../utils/storage'
import { getAgenda } from '../../utils/agenda-storage'
import { getSeparacoes } from '../../utils/separacao-storage'
import { agendaStatusLabel, agendaStatusBg } from '../../utils/agenda-helpers'
import { statusLabel, statusColor, formatDate } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { getControleCirurgias } from '../../utils/controle-storage'
import type { RequisitionStatus } from '../../types'
import type { AgendaItem, AgendaStatus } from '../../types/agenda'
import type { ControleCirurgia } from '../../types/controle'
import type { SeparacaoRecord } from '../../types'

/* ─── Operational color palette ───────────────────────────────────── */
const C = {
  blue:   '#2563EB', green: '#16A34A', teal: '#0D9488',
  orange: '#F59E0B', red:   '#DC2626', purple: '#7C3AED',
  indigo: '#4F46E5', yellow: '#EAB308',
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: '#94A3B8', enviada: C.blue, em_analise: C.orange,
  aprovada: C.green, separacao_material: C.purple,
  material_enviado: C.indigo, finalizada: C.teal, cancelada: C.red,
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

const PIPELINE_STEPS = [
  { status: 'enviada',          label: 'Solicitadas',   color: C.blue   },
  { status: 'aprovada',         label: 'Autorizadas',   color: C.green  },
  { status: 'separacao_material',label: 'Em Separação', color: C.purple },
  { status: 'material_enviado', label: 'Enviadas',      color: C.indigo },
  { status: 'finalizada',       label: 'Finalizadas',   color: C.teal   },
]

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
        {/* Row 1: time + tags */}
        <div className="flex items-start gap-3 mb-3">
          {/* Time block */}
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

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 flex-1">
            {tags.map(t => (
              <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: TAGS[t].bg, color: TAGS[t].color }}>
                {TAGS[t].label}
              </span>
            ))}
            {/* Only show status badge if not already shown via a tag */}
            {!['orcamento_pre','cirurgia_faturada'].includes(item.status) && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agendaStatusBg(item.status)}`}>
                {agendaStatusLabel(item.status)}
              </span>
            )}
          </div>
        </div>

        {/* Patient name */}
        <p className="font-bold text-sm mb-2 leading-tight" style={{ color: T.text1 }}>
          {item.paciente || item.procedimento || 'Cirurgia'}
        </p>

        {/* Info grid */}
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
/*  CRITICAL PENDENCIES PANEL                                           */
/* ═══════════════════════════════════════════════════════════════════ */
function CriticalPendencies({
  reqs, agenda, separacoes,
}: {
  reqs: import('../../types').Requisition[]
  agenda: AgendaItem[]
  separacoes: SeparacaoRecord[]
}) {
  const T = useT()
  const navigate = useNavigate()
  const sepReqIds = new Set(separacoes.map(s => s.reqId))
  const today = todayStr()
  const tomorrow = tomorrowStr()

  const pendencies = [
    {
      label: 'Aguardando autorização',
      count: reqs.filter(r => ['enviada', 'em_analise'].includes(r.status)).length,
      color: C.orange, icon: AlertTriangle, route: '/requisicoes',
    },
    {
      label: 'Materiais não separados',
      count: reqs.filter(r => !['cancelada','rascunho'].includes(r.status) && !sepReqIds.has(r.id)).length,
      color: C.red, icon: Package, route: '/separacao',
    },
    {
      label: 'Cirurgias sem confirmação',
      count: agenda.filter(i => ['agendada','nova_cirurgia'].includes(i.status) && (i.data === today || i.data === tomorrow)).length,
      color: C.purple, icon: CalendarClock, route: '/requisicoes',
    },
    {
      label: 'Orçamentos pendentes',
      count: agenda.filter(i => i.status === 'orcamento_pre').length,
      color: C.indigo, icon: FileText, route: '/requisicoes',
    },
  ].filter(p => p.count > 0)

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 16,
      boxShadow: T.shadow,
      overflow: 'hidden',
    }}>
      <div className="px-4 py-3.5 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${T.divider}` }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,59,48,0.12)' }}>
          <AlertCircle size={13} style={{ color: C.red }} />
        </div>
        <p className="font-bold text-sm" style={{ color: T.text1 }}>Pendências Críticas</p>
        {pendencies.length > 0 && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,59,48,0.12)', color: C.red }}>
            {pendencies.reduce((s, p) => s + p.count, 0)}
          </span>
        )}
      </div>

      {pendencies.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: C.green, opacity: 0.6 }} />
          <p className="text-sm font-medium" style={{ color: T.text3 }}>Tudo em ordem!</p>
          <p className="text-xs mt-0.5" style={{ color: T.text3 }}>Nenhuma pendência crítica</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: T.divider }}>
          {pendencies.map(p => (
            <button key={p.label} onClick={() => navigate(p.route)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${p.color}14` }}>
                <p.icon size={14} style={{ color: p.color }} />
              </div>
              <span className="flex-1 text-xs font-medium" style={{ color: T.text2 }}>{p.label}</span>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: p.color }}>{p.count}</span>
              <ChevronRight size={12} style={{ color: T.text3, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  HOSPITAL CHART WIDGET                                               */
/* ═══════════════════════════════════════════════════════════════════ */
const HOSP_COLORS = [C.blue, C.teal, C.orange, C.purple, '#C7C7CC']

function HospitalChartWidget({ hospitals, total }: { hospitals: { nome: string; total: number }[]; total: number }) {
  const T = useT()
  const navigate = useNavigate()

  if (!hospitals.length) return null

  const data = hospitals.map((h, i) => ({ ...h, color: HOSP_COLORS[i] ?? '#C7C7CC' }))

  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, boxShadow: T.shadow, overflow: 'hidden' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <Building2 size={14} style={{ color: C.blue }} />
        <p className="font-bold text-sm" style={{ color: T.text1 }}>Cirurgias por Hospital</p>
      </div>

      <div className="p-4">
        {/* Donut chart centered */}
        <div className="flex justify-center">
          <PieChart width={130} height={130}>
            <Pie data={data} dataKey="total" cx="50%" cy="50%" outerRadius={60} innerRadius={34} paddingAngle={2}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {data.map(h => (
            <div key={h.nome} className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: h.color }} />
              <span className="text-xs flex-1 leading-snug" style={{ color: T.text2 }}>{h.nome}</span>
              <span className="text-xs font-semibold flex-shrink-0 whitespace-nowrap" style={{ color: T.text1 }}>
                {h.total} <span style={{ color: T.text3 }}>({Math.round((h.total / total) * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/relatorios')}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold pt-3"
          style={{ borderTop: `1px solid ${T.divider}`, color: C.blue }}>
          Ver relatório completo <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  OPERATIONAL PIPELINE                                                */
/* ═══════════════════════════════════════════════════════════════════ */
function OperationalPipeline({ reqs }: { reqs: import('../../types').Requisition[] }) {
  const T = useT()
  const navigate = useNavigate()

  const counts = PIPELINE_STEPS.map(s => ({
    ...s,
    count: reqs.filter(r => r.status === s.status).length,
  }))
  const total = counts.reduce((s, c) => s + c.count, 0)

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.cardBorder}`,
      borderRadius: 16, boxShadow: T.shadow, overflow: 'hidden',
    }}>
      <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: C.blue }} />
            <p className="font-bold text-sm" style={{ color: T.text1 }}>Pipeline Operacional</p>
          </div>
          <span className="text-xs" style={{ color: T.text3 }}>{total} requisições ativas</span>
        </div>
      </div>

      <div className="p-4">
        {/* Progress bar */}
        {total > 0 && (
          <div className="flex h-1.5 rounded-full overflow-hidden mb-4 gap-0.5">
            {counts.map(s => s.count > 0 && (
              <div key={s.status} className="h-full rounded-full transition-all"
                style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
            ))}
          </div>
        )}

        {/* Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {counts.map((s, i) => (
            <button key={s.status} onClick={() => navigate('/requisicoes')}
              className="text-left p-3 rounded-xl transition-all"
              style={{
                background: s.count > 0 ? `${s.color}0D` : T.inputBg,
                border: `1px solid ${s.count > 0 ? `${s.color}25` : T.cardBorder}`,
              }}
              onMouseEnter={e => { if (s.count > 0) (e.currentTarget as HTMLElement).style.background = `${s.color}18` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = s.count > 0 ? `${s.color}0D` : T.inputBg }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.count > 0 ? s.color : T.text3 }}>
                  {i + 1}
                </span>
                {i < 4 && <ChevronRight size={10} style={{ color: T.text3 }} />}
              </div>
              <p className="text-2xl font-bold leading-none mb-1" style={{ color: s.count > 0 ? s.color : T.text3 }}>
                {s.count}
              </p>
              <p className="text-xs font-medium" style={{ color: T.text3 }}>{s.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  PRIORITY PANEL                                                       */
/* ═══════════════════════════════════════════════════════════════════ */
function PriorityPanel({
  agenda, separacoes,
}: {
  agenda: AgendaItem[]
  separacoes: SeparacaoRecord[]
}) {
  const T = useT()
  const navigate = useNavigate()

  const today    = todayStr()
  const tomorrow = tomorrowStr()

  const sepReqIds = new Set(separacoes.map(s => s.reqId))

  const isTerminal = (s: AgendaStatus) => ['cirurgia_finalizada','cirurgia_faturada','cancelada'].includes(s)

  const priorities = [
    {
      emoji: '🔴', label: 'Atrasadas', key: 'atrasadas',
      color: '#DC2626', bg: 'rgba(220,38,38,0.08)',
      count: agenda.filter(i => !isTerminal(i.status) && i.data && i.data < today).length,
      route: '/requisicoes',
    },
    {
      emoji: '🟠', label: 'Saem Hoje', key: 'hoje',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',
      count: agenda.filter(i => !isTerminal(i.status) && i.data === today).length,
      route: '/separacao',
    },
    {
      emoji: '🟡', label: 'Próximas 24h', key: 'amanha',
      color: '#EAB308', bg: 'rgba(234,179,8,0.08)',
      count: agenda.filter(i => !isTerminal(i.status) && i.data === tomorrow).length,
      route: '/requisicoes',
    },
    {
      emoji: '🟢', label: 'Em Dia', key: 'em_dia',
      color: '#16A34A', bg: 'rgba(22,163,74,0.08)',
      count: agenda.filter(i => !isTerminal(i.status) && i.data > tomorrow).length,
      route: '/requisicoes',
    },
    {
      emoji: '🔵', label: 'Ag. Separação', key: 'sep',
      color: '#2563EB', bg: 'rgba(37,99,235,0.08)',
      count: agenda.filter(i => ['aprovada','agendada'].includes(i.status) && !sepReqIds.has(i.id) && i.data >= today).length,
      route: '/separacao',
    },
    {
      emoji: '🟣', label: 'Sem Instr.', key: 'instr',
      color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',
      count: agenda.filter(i => !isTerminal(i.status) && !i.instrumentadores && i.data >= today).length,
      route: '/instrumentadores',
    },
  ]

  // Only show if there's any data
  const total = priorities.reduce((s, p) => s + p.count, 0)
  if (total === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <Zap size={14} style={{ color: C.orange }} />
        <p className="font-bold text-sm" style={{ color: T.text1 }}>Painel de Prioridades Operacionais</p>
        <span className="text-xs ml-auto" style={{ color: T.text3 }}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0.5 p-0.5">
        {priorities.map(p => (
          <button key={p.key} onClick={() => navigate(p.route)}
            className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl transition-all group"
            style={{ background: p.count > 0 ? p.bg : (T.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}
            onMouseEnter={e => { if (p.count > 0) (e.currentTarget as HTMLElement).style.background = p.bg.replace('0.08','0.15') }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = p.count > 0 ? p.bg : (T.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}>
            <span className="text-xl leading-none">{p.emoji}</span>
            <span className="text-2xl font-black leading-none" style={{ color: p.count > 0 ? p.color : T.text3 }}>{p.count}</span>
            <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: p.count > 0 ? p.color : T.text3 }}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION HEADER                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
function SectionHeader({ icon, title, subtitle, action }: {
  icon: React.ReactNode; title: string; subtitle?: string
  action?: { label: string; onClick: () => void }
}) {
  const T = useT()
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: T.text1 }}>{title}</p>
        {subtitle && <p className="text-xs" style={{ color: T.text3 }}>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick}
          className="text-xs font-medium flex items-center gap-1 flex-shrink-0"
          style={{ color: C.blue }}>
          {action.label} <ArrowRight size={11} />
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STAT CARD                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, color, pulse, active, onClick }: {
  icon: ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string; value: number; color: string
  pulse?: boolean; active?: boolean; onClick?: () => void
}) {
  const T = useT()
  return (
    <button type="button" onClick={onClick} className="rounded-2xl p-4 text-left transition-all duration-150 w-full"
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
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CONTROLE STATS STRIP                                                */
/* ═══════════════════════════════════════════════════════════════════ */
function ControleStrip({ controle }: { controle: ControleCirurgia[] }) {
  const T = useT()
  const navigate = useNavigate()
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  const mes = controle.filter(c => {
    const d = new Date(c.data)
    return d.getMonth() + 1 === mesAtual && d.getFullYear() === anoAtual
  })

  if (!mes.length) return null

  const stats = [
    { label: 'Total',     value: mes.length,                                     color: '#FF3B30' },
    { label: 'Ortopedia', value: mes.filter(c => c.segmento === 'ortopedia').length, color: C.blue   },
    { label: 'Trauma',    value: mes.filter(c => c.segmento === 'trauma').length,    color: C.orange },
    { label: 'Neuro',     value: mes.filter(c => c.segmento === 'neuro').length,     color: C.purple },
    { label: 'Coluna',    value: mes.filter(c => c.segmento === 'coluna').length,     color: C.green  },
    { label: 'Canceladas',value: mes.filter(c => c.acompanhamento === 'cancelada').length, color: C.red },
  ]

  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, boxShadow: T.shadow, overflow: 'hidden' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <div className="flex items-center gap-2">
          <ClipboardList size={14} style={{ color: '#FF3B30' }} />
          <p className="font-bold text-sm" style={{ color: T.text1 }}>
            Controle de Cirurgias — {MESES_PT[mesAtual - 1]} {anoAtual}
          </p>
        </div>
        <button onClick={() => navigate('/controle')} className="text-xs font-medium flex items-center gap-1" style={{ color: '#FF3B30' }}>
          Ver completo <ArrowRight size={11} />
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: T.text3 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
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

  const [reqs, setReqs] = useState<import('../../types').Requisition[]>([])
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [separacoes, setSeparacoes] = useState<SeparacaoRecord[]>([])
  const [controle, setControle] = useState<ControleCirurgia[]>([])
  const [showAll, setShowAll] = useState(false)
  const [showTomorrow, setShowTomorrow] = useState(false)

  useEffect(() => {
    getRequisitions().then(all => setReqs(isAdmin ? all : all.filter(r => r.solicitanteId === user?.id)))
    getAgenda().then(setAgenda)
    getSeparacoes().then(setSeparacoes)
    if (isAdmin) getControleCirurgias().then(setControle).catch(() => {})
  }, [isAdmin, user?.id])

  const sepReqIds = useMemo(() => new Set(separacoes.map(s => s.reqId)), [separacoes])

  const today    = todayStr()
  const tomorrow = tomorrowStr()

  const todayItems     = useMemo(() => sortByTime(agenda.filter(i => i.data === today)), [agenda, today])
  const tomorrowItems  = useMemo(() => sortByTime(agenda.filter(i => i.data === tomorrow)), [agenda, tomorrow])
  const next24hItems   = useMemo(() => sortByTime([...todayItems, ...tomorrowItems]), [todayItems, tomorrowItems])
  const hasAgenda      = agenda.length > 0

  const agendaStats = useMemo(() => {
    const hospMap = agenda.reduce((acc, i) => {
      if (i.hospital) acc[i.hospital] = (acc[i.hospital] || 0) + 1; return acc
    }, {} as Record<string, number>)
    const topHospitals = Object.entries(hospMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([nome, total]) => ({ nome, total }))
    return {
      total: agenda.length,
      hoje: todayItems.length,
      autorizadas: agenda.filter(i => i.autorizada && !['cancelada','cirurgia_faturada','cirurgia_finalizada'].includes(i.status)).length,
      pendentes: agenda.filter(i => !['cirurgia_finalizada','cirurgia_faturada','cancelada'].includes(i.status)).length,
      finalizadas: agenda.filter(i => ['cirurgia_finalizada','cirurgia_faturada'].includes(i.status)).length,
      topHospitals,
    }
  }, [agenda, todayItems])

  const reqStats = useMemo(() => {
    const statusDist = Object.entries(
      reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {} as Record<string, number>)
    ).map(([status, total]) => ({ status, total, label: statusLabel(status as RequisitionStatus) }))
    const recent = [...reqs]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
    return { statusDist, recent, total: reqs.length }
  }, [reqs])

  /* ── items to show in main list ── */
  const mainItems = showAll
    ? sortByTime(agenda.filter(i => !['cancelada'].includes(i.status)))
    : showTomorrow ? tomorrowItems : todayItems
  const mainTitle = showAll ? 'Todas as Cirurgias' : showTomorrow ? 'Amanhã' : 'Cirurgias de Hoje'
  const mainSubtitle = showAll
    ? `${agenda.length} no total`
    : showTomorrow ? `${tomorrowItems.length} cirurgia${tomorrowItems.length !== 1 ? 's' : ''}`
    : `${todayItems.length} cirurgia${todayItems.length !== 1 ? 's' : ''}`

  const tooltipStyle = {
    borderRadius: 12, border: `1px solid ${T.cardBorder}`, fontSize: 12,
    fontFamily: '-apple-system', background: T.card, color: T.text1,
  }

  return (
    <div className="space-y-5">

      {/* ── Header: greeting + action ── */}
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

      {/* ── KPI strip ── */}
      {hasAgenda ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={CalendarClock} label="Total"       value={agendaStats.total}       color={C.blue}   onClick={() => navigate('/requisicoes')} />
          <StatCard icon={Activity}      label="Hoje"        value={agendaStats.hoje}         color={C.green}  pulse onClick={() => navigate('/requisicoes', { state: { filterData: 'hoje' } })} />
          <StatCard icon={ShieldCheck}   label="Autorizadas" value={agendaStats.autorizadas}  color={C.teal}   onClick={() => navigate('/requisicoes', { state: { filterAutorizada: true } })} />
          <StatCard icon={Clock}         label="Pendentes"   value={agendaStats.pendentes}    color={C.orange} onClick={() => navigate('/requisicoes')} />
          <StatCard icon={CheckCircle2}  label="Finalizadas" value={agendaStats.finalizadas}  color={C.indigo} onClick={() => navigate('/requisicoes')} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={FileText}      label="Total"       value={reqStats.total}                                    color={C.blue}   />
          <StatCard icon={AlertTriangle} label="Emergências" value={reqs.filter(r=>r.tipoCirurgia==='emergencia').length} color={C.red}    />
          <StatCard icon={Clock}         label="Pendentes"   value={reqs.filter(r=>!['finalizada','cancelada'].includes(r.status)).length} color={C.orange} />
          <StatCard icon={CheckCircle2}  label="Finalizadas" value={reqs.filter(r=>r.status==='finalizada').length}    color={C.teal}   />
          <StatCard icon={Activity}      label="Eletivas"    value={reqs.filter(r=>r.tipoCirurgia==='eletiva').length} color={C.green}  />
        </div>
      )}

      {/* ── Priority panel ── */}
      {hasAgenda && <PriorityPanel agenda={agenda} separacoes={separacoes} />}

      {/* ── Two-column main layout ── */}
      {hasAgenda ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

          {/* ── LEFT: Surgery cards ── */}
          <div>
            {/* Tab switcher */}
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
                  {showTomorrow ? 'Nenhuma cirurgia amanhã' : 'Nenhuma cirurgia hoje'}
                </p>
                <p className="text-xs mt-1" style={{ color: T.text3 }}>
                  {showAll ? 'Nenhuma cirurgia na agenda' : 'Tente ver outro período'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mainItems.map((item, i) => (
                  <SurgeryCard key={item.id || i} item={item}
                    isSeparated={false}
                    showDate={showTomorrow || showAll} />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Hospital chart ── */}
          <div className="space-y-4">
            <HospitalChartWidget hospitals={agendaStats.topHospitals} total={agendaStats.total} />
          </div>
        </div>
      ) : (
        /* No agenda — show import CTA */
        <div className="rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3"
          style={{ background: T.card, border: `1px dashed ${T.cardBorder}`, boxShadow: T.shadow }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${C.blue}10` }}>
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

      {/* ── Controle de Cirurgias strip ── */}
      {isAdmin && controle.length > 0 && <ControleStrip controle={controle} />}


      {/* ── Recent reqs ── */}
      {reqStats.recent.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: T.text1 }}>
              <FileText size={15} style={{ color: C.blue }} /> Agendamentos Recentes
            </h3>
            <button onClick={() => navigate('/requisicoes')}
              className="text-xs font-medium flex items-center gap-1" style={{ color: C.blue }}>
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: T.divider }}>
            {reqStats.recent.map(r => (
              <button key={r.id} onClick={() => navigate(`/requisicoes/${r.id}`)}
                className="w-full text-left px-4 py-3.5 transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: r.tipoCirurgia === 'emergencia' ? 'rgba(255,59,48,0.10)' : `${C.blue}10` }}>
                    {r.tipoCirurgia === 'emergencia'
                      ? <AlertTriangle size={14} style={{ color: C.red }} />
                      : <FileText size={14} style={{ color: C.blue }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-mono" style={{ color: T.text3 }}>{r.numero}</span>
                      {r.tipoCirurgia === 'emergencia' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: C.red, color: '#fff' }}>EMERG</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: T.text1 }}>{r.pacienteNome || 'Paciente não informado'}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: T.text3 }}>
                      {r.hospitalNome}{r.cirurgiaData ? ` · ${formatDate(r.cirurgiaData)}` : ''}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 text-xs ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
