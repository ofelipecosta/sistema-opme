import { X, Eye, EyeOff, CalendarDays, Clock, Layers, Columns } from 'lucide-react'
import { agendaStatusLabel } from '../../utils/agenda-helpers'
import type { AgendaStatus } from '../../types/agenda'

const ALL_STATUSES: AgendaStatus[] = [
  'agendada', 'em_andamento', 'materiais_autorizados', 'vale_consignacao',
  'orcamento_pre', 'orcamento_pos', 'cirurgia_finalizada', 'cirurgia_faturada',
  'nova_cirurgia', 'cancelada',
]

const STATUS_DESC: Record<AgendaStatus, string> = {
  agendada:              'Cirurgias confirmadas no agendamento',
  em_andamento:          'Em andamento agora',
  materiais_autorizados: 'Materiais aprovados pela operadora',
  vale_consignacao:      'Materiais em regime de consignação',
  orcamento_pre:         'Aguardando orçamento pré-cirurgia',
  orcamento_pos:         'Orçamento gerado após cirurgia',
  cirurgia_finalizada:   'Cirurgia concluída',
  cirurgia_faturada:     'Faturada e encerrada',
  nova_cirurgia:         'Nova cirurgia adicionada',
  cancelada:             'Cirurgias canceladas',
}

const STATUS_COLORS: Record<AgendaStatus, string> = {
  agendada:              '#007AFF',
  em_andamento:          '#FF9500',
  materiais_autorizados: '#34C759',
  vale_consignacao:      '#AF52DE',
  orcamento_pre:         '#FF6B00',
  orcamento_pos:         '#FF6B00',
  cirurgia_finalizada:   '#00C7BE',
  cirurgia_faturada:     '#5AC8FA',
  nova_cirurgia:         '#007AFF',
  cancelada:             '#FF3B30',
}

const SETTINGS_KEY = 'opme_tv_settings'

export interface DateFilter {
  mode: 'all' | 'today' | 'week' | 'range'
  from: string
  to: string
}

export interface TVSettings {
  hiddenStatuses: AgendaStatus[]
  dateFilter: DateFilter
  hidePast: boolean    // hide surgeries before today
  compact: boolean     // dense rows — fit everything on screen
  hiddenColumns: string[]
}

export const TV_COLUMN_DEFS: { id: string; label: string; desc: string }[] = [
  { id: 'codigo',           label: 'Cód.',           desc: 'Código da cirurgia'         },
  { id: 'hospital',         label: 'Hospital',        desc: 'Nome do hospital'           },
  { id: 'medico',           label: 'Médico',          desc: 'Médico responsável'         },
  { id: 'convenio',         label: 'Convênio',        desc: 'Plano/convênio do paciente' },
  { id: 'cliente',          label: 'Cliente',         desc: 'Operadora / cliente'        },
  { id: 'vendedor',         label: 'Vendedor',        desc: 'Vendedor responsável'       },
  { id: 'instrumentadores', label: 'Instrumentador',  desc: 'Instrumentador cirúrgico'   },
  { id: 'autorizada',       label: 'Aut.',            desc: 'Cirurgia autorizada'        },
]

const DEFAULT_DATE_FILTER: DateFilter = { mode: 'all', from: '', to: '' }

export function loadTVSettings(): TVSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        hiddenStatuses: p.hiddenStatuses ?? ['cancelada'],
        dateFilter:     p.dateFilter     ?? DEFAULT_DATE_FILTER,
        hidePast:       p.hidePast       ?? false,
        compact:        p.compact        ?? false,
        hiddenColumns:  p.hiddenColumns  ?? [],
      }
    }
  } catch {}
  return { hiddenStatuses: ['cancelada'], dateFilter: DEFAULT_DATE_FILTER, hidePast: false, compact: false, hiddenColumns: [] }
}

export function saveTVSettings(s: TVSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

interface Props {
  settings: TVSettings
  onChange: (s: TVSettings) => void
  onClose: () => void
  dark?: boolean
}

export default function TVSettingsPanel({ settings, onChange, onClose, dark = false }: Props) {
  const df = settings.dateFilter ?? DEFAULT_DATE_FILTER

  const T = dark ? {
    overlay:       'rgba(0,0,0,0.72)',
    panelBg:       'rgba(28,28,30,0.96)',
    panelBorder:   'rgba(255,255,255,0.10)',
    headerBorder:  'rgba(255,255,255,0.08)',
    text1:         '#FFFFFF',
    text2:         '#AEAEB2',
    text3:         '#636366',
    segBg:         'rgba(255,255,255,0.06)',
    segActive:     '#007AFF',
    segActiveTxt:  '#FFFFFF',
    segInactive:   '#AEAEB2',
    rowBg:         'rgba(255,255,255,0.04)',
    rowBorder:     'rgba(255,255,255,0.06)',
    rowActiveBg:   'rgba(255,255,255,0.07)',
    inputBg:       'rgba(255,255,255,0.06)',
    inputBorder:   'rgba(255,255,255,0.10)',
    inputColor:    '#FFFFFF',
    closeBtn:      'rgba(255,255,255,0.08)',
    closeBtnColor: '#AEAEB2',
    sectionColor:  '#636366',
    toggleTrack:   'rgba(255,255,255,0.12)',
    toggleOn:      '#34C759',
  } : {
    overlay:       'rgba(0,0,0,0.40)',
    panelBg:       'rgba(255,255,255,0.96)',
    panelBorder:   'rgba(0,0,0,0.08)',
    headerBorder:  'rgba(0,0,0,0.06)',
    text1:         '#1D1D1F',
    text2:         '#48484A',
    text3:         '#8E8E93',
    segBg:         'rgba(0,0,0,0.06)',
    segActive:     '#007AFF',
    segActiveTxt:  '#FFFFFF',
    segInactive:   '#48484A',
    rowBg:         'rgba(0,0,0,0.02)',
    rowBorder:     'rgba(0,0,0,0.05)',
    rowActiveBg:   'rgba(0,0,0,0.04)',
    inputBg:       'rgba(0,0,0,0.04)',
    inputBorder:   'rgba(0,0,0,0.08)',
    inputColor:    '#1D1D1F',
    closeBtn:      'rgba(0,0,0,0.06)',
    closeBtnColor: '#48484A',
    sectionColor:  '#8E8E93',
    toggleTrack:   'rgba(0,0,0,0.10)',
    toggleOn:      '#34C759',
  }

  const font = "-apple-system,'SF Pro Display','SF Pro Text','Helvetica Neue',sans-serif"

  function set(patch: Partial<TVSettings>) {
    const next = { ...settings, ...patch }
    onChange(next); saveTVSettings(next)
  }

  function toggleStatus(status: AgendaStatus) {
    const hidden = settings.hiddenStatuses.includes(status)
      ? settings.hiddenStatuses.filter(s => s !== status)
      : [...settings.hiddenStatuses, status]
    set({ hiddenStatuses: hidden })
  }

  function toggleColumn(id: string) {
    const hidden = (settings.hiddenColumns ?? []).includes(id)
      ? (settings.hiddenColumns ?? []).filter(c => c !== id)
      : [...(settings.hiddenColumns ?? []), id]
    set({ hiddenColumns: hidden })
  }

  const visibleCount = ALL_STATUSES.length - settings.hiddenStatuses.length

  const DATE_MODES: { v: DateFilter['mode']; l: string }[] = [
    { v: 'all',   l: 'Todas' },
    { v: 'today', l: 'Hoje' },
    { v: 'week',  l: 'Semana' },
    { v: 'range', l: 'Intervalo' },
  ]

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.overlay,
        backdropFilter: 'blur(12px) saturate(1.4)',
        fontFamily: font,
      }}
    >
      <div style={{
        background: T.panelBg,
        border: `1px solid ${T.panelBorder}`,
        borderRadius: 20,
        width: 480,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: dark
          ? '0 32px 80px rgba(0,0,0,0.7)'
          : '0 24px 60px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(40px) saturate(1.8)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${T.headerBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ color: T.text1, fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
              Configurar Painel TV
            </p>
            <p style={{ color: T.text3, fontSize: 12, marginTop: 3 }}>
              {visibleCount} de {ALL_STATUSES.length} status visíveis
            </p>
          </div>
          <button onClick={onClose} style={{
            background: T.closeBtn, border: 'none', borderRadius: '50%',
            width: 28, height: 28, cursor: 'pointer', color: T.closeBtnColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

          {/* ── Date filter ── */}
          <SectionLabel icon={<CalendarDays size={10} />} label="Filtro de Datas" color={T.sectionColor} />

          {/* 4-tab segmented control */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 3, background: T.segBg,
            borderRadius: 10, padding: 3, marginBottom: 14,
          }}>
            {DATE_MODES.map(({ v, l }) => {
              const active = df.mode === v
              return (
                <button key={v} onClick={() => set({ dateFilter: { ...df, mode: v } })}
                  style={{
                    padding: '7px 0', border: 'none', borderRadius: 8,
                    cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 500,
                    background: active ? T.segActive : 'transparent',
                    color: active ? T.segActiveTxt : T.segInactive,
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 1px 4px rgba(0,122,255,0.3)' : 'none',
                    fontFamily: font,
                  }}
                >
                  {l}
                </button>
              )
            })}
          </div>

          {/* Week info */}
          {df.mode === 'week' && (
            <WeekBanner dark={dark} T={T} />
          )}

          {df.mode === 'range' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(['from', 'to'] as const).map(key => (
                <div key={key}>
                  <p style={{ fontSize: 10, color: T.text3, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {key === 'from' ? 'De' : 'Até'}
                  </p>
                  <input type="date" value={df[key]}
                    onChange={e => set({ dateFilter: { ...df, [key]: e.target.value } })}
                    style={{
                      width: '100%', background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                      borderRadius: 10, padding: '8px 10px', color: T.inputColor,
                      fontSize: 13, outline: 'none', fontFamily: font, boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Display options ── */}
          <SectionLabel icon={<Clock size={10} />} label="Exibição" color={T.sectionColor} top={df.mode === 'range' ? 6 : 16} />

          <ToggleRow
            label="Ocultar cirurgias passadas"
            desc="Esconde datas anteriores a hoje"
            on={settings.hidePast}
            onToggle={() => set({ hidePast: !settings.hidePast })}
            T={T} font={font}
          />
          <ToggleRow
            label="Modo compacto (sem rolagem)"
            desc="Reduz tamanho das linhas para caber tudo na TV"
            on={settings.compact}
            onToggle={() => set({ compact: !settings.compact })}
            T={T} font={font}
          />

          {/* ── Column toggles ── */}
          <SectionLabel icon={<Columns size={10} />} label="Colunas Visíveis" color={T.sectionColor} top={16} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
            {TV_COLUMN_DEFS.map(col => {
              const hidden = (settings.hiddenColumns ?? []).includes(col.id)
              return (
                <button key={col.id} onClick={() => toggleColumn(col.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.rowBorder}`,
                  background: hidden ? T.rowBg : T.rowActiveBg,
                  cursor: 'pointer', textAlign: 'left',
                  opacity: hidden ? 0.45 : 1, transition: 'all 0.12s',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: hidden ? T.text3 : T.text1 }}>{col.label}</p>
                    <p style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{col.desc}</p>
                  </div>
                  <span style={{ flexShrink: 0, marginLeft: 10, color: hidden ? T.text3 : T.text2 }}>
                    {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Status toggles ── */}
          <SectionLabel icon={<Layers size={10} />} label="Exibir Status" color={T.sectionColor} top={16} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {ALL_STATUSES.map(status => {
              const hidden = settings.hiddenStatuses.includes(status)
              const color  = STATUS_COLORS[status]
              return (
                <button key={status} onClick={() => toggleStatus(status)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.rowBorder}`,
                  background: hidden ? T.rowBg : T.rowActiveBg,
                  cursor: 'pointer', textAlign: 'left',
                  opacity: hidden ? 0.45 : 1, transition: 'all 0.12s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 3, height: 28, borderRadius: 2, flexShrink: 0, background: hidden ? T.rowBorder : color }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: hidden ? T.text3 : T.text1 }}>
                        {agendaStatusLabel(status)}
                      </p>
                      <p style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{STATUS_DESC[status]}</p>
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, marginLeft: 10, color: hidden ? T.text3 : T.text2 }}>
                    {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 22px',
          borderTop: `1px solid ${T.headerBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={() => set({ hiddenStatuses: [] })}
            style={{ fontSize: 13, color: '#007AFF', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500, fontFamily: font }}>
            Mostrar todos
          </button>
          <button onClick={onClose} style={{
            background: '#007AFF', color: '#fff', border: 'none',
            borderRadius: 10, padding: '9px 22px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: font,
            boxShadow: '0 2px 8px rgba(0,122,255,0.35)',
          }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────── */

function SectionLabel({ icon, label, color, top = 0 }: { icon: React.ReactNode; label: string; color: string; top?: number }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
      color, marginBottom: 10, marginTop: top, display: 'flex', alignItems: 'center', gap: 5,
    }}>
      {icon} {label}
    </p>
  )
}

function ToggleRow({ label, desc, on, onToggle, T, font }: {
  label: string; desc: string; on: boolean; onToggle: () => void
  T: { text1: string; text3: string; rowBg: string; rowBorder: string; toggleOn: string; toggleTrack: string }
  font: string
}) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.rowBorder}`,
      background: T.rowBg, cursor: 'pointer', textAlign: 'left',
      marginBottom: 6, width: '100%', fontFamily: font,
    }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>{label}</p>
        <p style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{desc}</p>
      </div>
      {/* iOS-style toggle */}
      <div style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0, marginLeft: 12,
        background: on ? T.toggleOn : T.toggleTrack,
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: on ? 21 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left 0.2s',
        }} />
      </div>
    </button>
  )
}

function WeekBanner({ dark, T }: { dark: boolean; T: { text1: string; text3: string } }) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 10, marginBottom: 14,
      background: dark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.07)',
      border: '1px solid rgba(0,122,255,0.20)',
    }}>
      <p style={{ fontSize: 12, color: '#007AFF', fontWeight: 600 }}>
        Semana atual: {fmt(monday)} – {fmt(sunday)}
      </p>
      <p style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
        Exibe apenas as cirurgias desta semana (seg–dom)
      </p>
    </div>
  )
}
