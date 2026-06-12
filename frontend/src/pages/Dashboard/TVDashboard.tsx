import { useState, useEffect, useRef } from 'react'
import { Minimize2, RefreshCw, SlidersHorizontal, Play, Pause, Moon, Sun, Activity } from 'lucide-react'
import { getAgenda } from '../../utils/agenda-storage'
import TVSettingsPanel, { loadTVSettings, type TVSettings } from './TVSettings'
import type { AgendaItem } from '../../types/agenda'

interface Props { onExit: () => void }

/* ─── Hooks ─────────────────────────────────────────── */
function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return now
}

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('opme_tv_dark') === '1')
  function toggle() { setDark(d => { localStorage.setItem('opme_tv_dark', d ? '0' : '1'); return !d }) }
  return [dark, toggle] as const
}

/* ─── Date helpers ───────────────────────────────────── */
const todayStr    = () => new Date().toISOString().split('T')[0]
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] }
const isToday     = (d: string) => d === todayStr()
const isTomorrow  = (d: string) => d === tomorrowStr()

function weekRange(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: mon.toISOString().split('T')[0], to: sun.toISOString().split('T')[0] }
}

function fmtFullDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
}
function fmtDateLabel(ds: string) {
  const [y, m, day] = ds.split('-')
  const dt = new Date(+y, +m-1, +day)
  const wd = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dt.getDay()]
  return `${wd}, ${day}/${m}`
}

/* ─── Group by date ──────────────────────────────────── */
function groupByDate(items: AgendaItem[]) {
  const map = new Map<string, AgendaItem[]>()
  for (const i of items) { const l = map.get(i.data) || []; l.push(i); map.set(i.data, l) }
  return [...map.entries()]
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([date, its]) => ({ date, items: its.sort((a,b) => (a.horaCirurgia||'').localeCompare(b.horaCirurgia||'')) }))
}

/* ─── Date filter ────────────────────────────────────── */
function applyDateFilter(items: AgendaItem[], s: TVSettings): AgendaItem[] {
  const { mode, from, to } = s.dateFilter ?? { mode:'all', from:'', to:'' }
  if (mode === 'today') return items.filter(i => isToday(i.data))
  if (mode === 'week') {
    const { from: wf, to: wt } = weekRange()
    return items.filter(i => i.data >= wf && i.data <= wt)
  }
  if (mode === 'range' && from && to) return items.filter(i => i.data >= from && i.data <= to)
  if (mode === 'range' && from) return items.filter(i => i.data >= from)
  if (mode === 'range' && to)   return items.filter(i => i.data <= to)
  return items
}

function applyHidePast(items: AgendaItem[], hidePast: boolean): AgendaItem[] {
  if (!hidePast) return items
  const today = todayStr()
  return items.filter(i => i.data >= today)
}

/* ─── Status config ──────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  agendada:              { label: 'Agendada',      color: '#007AFF' },
  em_andamento:          { label: 'Em Andamento',  color: '#FF9500' },
  materiais_autorizados: { label: 'Autorizado',    color: '#34C759' },
  vale_consignacao:      { label: 'Consignação',   color: '#AF52DE' },
  orcamento_pre:         { label: 'Orc. Pré',      color: '#FF6B00' },
  orcamento_pos:         { label: 'Orc. Pós',      color: '#FF6B00' },
  cirurgia_finalizada:   { label: 'Finalizada',    color: '#00C7BE' },
  cirurgia_faturada:     { label: 'Faturada',      color: '#5AC8FA' },
  nova_cirurgia:         { label: 'Nova Cirurgia', color: '#007AFF' },
  cancelada:             { label: 'Cancelada',     color: '#FF3B30' },
}
function sColor(s: string) { return STATUS_CFG[s]?.color ?? '#007AFF' }
function sLabel(s: string) { return STATUS_CFG[s]?.label ?? s }

/* ─── Themes ─────────────────────────────────────────── */
const LIGHT = {
  bg:          '#F2F2F7',
  cardBg:      'rgba(255,255,255,0.80)',
  cardBorder:  'rgba(0,0,0,0.06)',
  headerBg:    'rgba(255,255,255,0.72)',
  colBg:       'rgba(242,242,247,0.9)',
  text1:       '#1D1D1F',
  text2:       '#48484A',
  text3:       '#8E8E93',
  text4:       '#AEAEB2',
  timeColor:   '#007AFF',
  divider:     'rgba(0,0,0,0.07)',
  shadow:      '0 2px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
  shadowCard:  '0 4px 28px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
  kpiCard:     'rgba(255,255,255,0.9)',
  emergBg:     'rgba(255,59,48,0.05)',
  emergBorder: 'rgba(255,59,48,0.18)',
  todayBg:     'rgba(0,122,255,0.04)',
  segLabel:    '#8E8E93',
  btnBg:       'rgba(0,0,0,0.06)',
  btnText:     '#48484A',
}
const DARK = {
  bg:          '#000000',
  cardBg:      'rgba(28,28,30,0.88)',
  cardBorder:  'rgba(255,255,255,0.07)',
  headerBg:    'rgba(18,18,20,0.90)',
  colBg:       'rgba(28,28,30,0.95)',
  text1:       '#FFFFFF',
  text2:       '#EBEBF5',
  text3:       '#AEAEB2',
  text4:       '#636366',
  timeColor:   '#0A84FF',
  divider:     'rgba(255,255,255,0.07)',
  shadow:      '0 2px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
  shadowCard:  '0 4px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
  kpiCard:     'rgba(44,44,46,0.9)',
  emergBg:     'rgba(255,59,48,0.08)',
  emergBorder: 'rgba(255,59,48,0.25)',
  todayBg:     'rgba(0,122,255,0.08)',
  segLabel:    '#636366',
  btnBg:       'rgba(255,255,255,0.08)',
  btnText:     '#EBEBF5',
}

// Grid: Hora | Hospital | Paciente/Procedimento | Médico | Convênio | Vendedor | Instrumentador | Aut | Status
const COLS = '88px 1.1fr 1.05fr 0.95fr 0.7fr 0.6fr 0.6fr 36px 148px'
const COL_HEADS = ['Horário','Hospital','Paciente · Procedimento','Médico','Convênio','Vendedor','Instrumentador','✓','Status']

const SCROLL_SPEED = 34

export default function TVDashboard({ onExit }: Props) {
  const now     = useNow()
  const [dark, toggleDark] = useDarkMode()
  const T = dark ? DARK : LIGHT

  const [allItems, setAllItems]         = useState<AgendaItem[]>([])
  const [countdown, setCountdown]       = useState(60)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings]         = useState<TVSettings>(loadTVSettings)
  const [autoScroll, setAutoScroll]     = useState(true)
  const compact = settings.compact

  const scrollRef = useRef<HTMLDivElement>(null)
  const animRef   = useRef<number | null>(null)
  const posRef    = useRef(0)
  const lastTs    = useRef<number | null>(null)

  const load = async () => {
    setAllItems(await getAgenda()); setCountdown(60)
    posRef.current = 0; lastTs.current = null
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { load(); return 60 } return c - 1 }), 1000)
    return () => clearInterval(t)
  }, [])

  // Reload immediately when agenda is updated (same tab via custom event, or cross-tab via storage event)
  useEffect(() => {
    function onUpdate() { load() }
    function onStorage(e: StorageEvent) { if (e.key === 'opme_agenda') load() }
    window.addEventListener('opme_agenda_updated', onUpdate)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('opme_agenda_updated', onUpdate)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !autoScroll) return
    const frame = (ts: number) => {
      if (lastTs.current === null) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000; lastTs.current = ts
      const max = el.scrollHeight - el.clientHeight
      if (max > 0) {
        posRef.current += SCROLL_SPEED * dt
        if (posRef.current > max + SCROLL_SPEED * 4) posRef.current = 0
        el.scrollTop = Math.max(0, Math.min(posRef.current, max))
      }
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [allItems, settings, autoScroll])

  useEffect(() => {
    if (!autoScroll && animRef.current) { cancelAnimationFrame(animRef.current); lastTs.current = null }
  }, [autoScroll])

  const filtered   = applyHidePast(
    applyDateFilter(allItems.filter(i => !settings.hiddenStatuses.includes(i.status as any)), settings),
    settings.hidePast,
  )
  const groups     = groupByDate(filtered)
  const todayItems = filtered.filter(i => isToday(i.data))
  const autorizadas = filtered.filter(i => i.autorizada).length
  const emergencias = filtered.filter(i => i.emergencia).length

  /* ─── Render ─────────────────────────── */
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:50, display:'flex', flexDirection:'column', overflow:'hidden',
      background: T.bg,
      fontFamily: "-apple-system,'SF Pro Display','SF Pro Text','Helvetica Neue',sans-serif",
      color: T.text1,
      transition: 'background 0.3s, color 0.3s',
    }}>

      {showSettings && (
        <TVSettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} dark={dark} />
      )}

      {/* ══════════════ HEADER ══════════════ */}
      <header style={{
        background: T.headerBg,
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        borderBottom: `1px solid ${T.divider}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        height: 80,
        gap: 0,
      }}>

        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0, paddingRight:28 }}>
          <div style={{
            width:40, height:40, borderRadius:12, flexShrink:0,
            background: 'linear-gradient(135deg,#007AFF 0%,#5AC8FA 100%)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 12px rgba(0,122,255,0.35)',
          }}>
            <Activity size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, letterSpacing:'0.02em', color: T.text1, lineHeight:1 }}>NOS · OPME</p>
            <p style={{ fontSize:10, color: T.text3, marginTop:3, letterSpacing:'0.04em', fontWeight:500 }}>Agenda Cirúrgica</p>
          </div>
        </div>

        <HDivider T={T} />

        {/* Date + Clock */}
        <div style={{ paddingLeft:24, paddingRight:24, flexShrink:0 }}>
          <p style={{
            fontFamily: "monospace, 'SF Mono'",
            fontSize: 40, fontWeight: 600, color: T.text1,
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </p>
          <p style={{ fontSize:11, color: T.text3, marginTop:4, textTransform:'capitalize', fontWeight:500 }}>
            {fmtFullDate(now)}
          </p>
        </div>

        <HDivider T={T} />

        {/* KPI cards */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 24px', flexShrink:0 }}>
          <KpiCard label="Hoje" value={todayItems.length} color="#34C759" T={T} glow />
          <KpiCard label="Total" value={filtered.length}  color="#007AFF" T={T} />
          <KpiCard label="Autorizadas" value={autorizadas} color="#00C7BE" T={T} />
          {emergencias > 0 && <KpiCard label="Emergência" value={emergencias} color="#FF3B30" T={T} />}
        </div>

        <div style={{ flex:1 }} />

        {/* Refresh indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:6, paddingRight:20, flexShrink:0 }}>
          <div style={{ position:'relative', width:28, height:28, flexShrink:0 }}>
            <svg viewBox="0 0 28 28" style={{ transform:'rotate(-90deg)', width:28, height:28 }}>
              <circle cx="14" cy="14" r="11" fill="none" stroke={T.divider} strokeWidth="2.5" />
              <circle cx="14" cy="14" r="11" fill="none"
                stroke={countdown <= 10 ? '#34C759' : '#007AFF'} strokeWidth="2.5"
                strokeDasharray={`${2*Math.PI*11}`}
                strokeDashoffset={`${2*Math.PI*11 * (countdown / 60)}`}
                strokeLinecap="round"
                style={{ transition:'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <span style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:8, fontWeight:700, color: countdown <= 10 ? '#34C759' : T.text3, fontFamily:'monospace',
            }}>{countdown}</span>
          </div>
          <span style={{ fontSize:10, color: T.text4, fontWeight:500, letterSpacing:'0.03em' }}>AUTO</span>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {!compact && (
          <HBtn onClick={() => setAutoScroll(v => !v)} T={T}>
            {autoScroll ? <Pause size={12} /> : <Play size={12} color="#34C759" />}
            <span style={{ color: autoScroll ? T.btnText : '#34C759' }}>{autoScroll ? 'Pausar' : 'Rolar'}</span>
          </HBtn>
        )}
          <HBtn onClick={() => setShowSettings(true)} T={T}>
            <SlidersHorizontal size={12} /> <span>Filtros</span>
          </HBtn>
          <HBtn onClick={toggleDark} T={T}>
            {dark ? <Sun size={12} /> : <Moon size={12} />}
          </HBtn>
          <HBtn onClick={load} T={T}>
            <RefreshCw size={11} />
          </HBtn>
          <HBtn onClick={onExit} T={T}>
            <Minimize2 size={12} /> <span>Sair</span>
          </HBtn>
        </div>
      </header>

      {/* ══════════════ COLUMN HEADERS ══════════════ */}
      <div style={{
        background: T.colBg,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.divider}`,
        flexShrink: 0,
        padding: '0 28px',
        height: 36,
      }}>
        <div style={{ display:'grid', gridTemplateColumns:COLS, height:'100%', alignItems:'center', gap:0 }}>
          {COL_HEADS.map(h => (
            <span key={h} style={{
              fontSize:10, fontWeight:600, textTransform:'uppercase',
              letterSpacing:'0.1em', color: T.text4,
              paddingRight: 12,
            }}>{h}</span>
          ))}
        </div>
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflow: compact ? 'hidden' : 'hidden',
        padding: compact ? '8px 16px 0' : '16px 20px 0',
        // In compact mode the inner div uses auto height; parent clips overflow
        display: 'flex', flexDirection: 'column',
      }}>
        {filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            flex:1, gap:16 }}>
            <Activity size={64} color={T.text4} strokeWidth={1} />
            <p style={{ fontSize:20, fontWeight:300, color: T.text3, letterSpacing:'0.02em' }}>
              {allItems.length > 0 ? 'Nenhuma cirurgia no período' : 'Nenhuma agenda importada'}
            </p>
          </div>
        ) : (
          <div style={{
            display:'flex', flexDirection:'column',
            gap: compact ? 10 : 20,
            paddingBottom: compact ? 8 : 64,
            flex: 1,
            overflow: compact ? 'hidden' : undefined,
          }}>
            {groups.map(({ date, items: gi }) => {
              const today = isToday(date)
              const tmrow = isTomorrow(date)
              return (
                <div key={date}>

                  {/* ── Date section label ── */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: compact ? 4 : 8, paddingLeft:4 }}>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      background: today ? 'rgba(0,122,255,0.1)' : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${today ? 'rgba(0,122,255,0.2)' : T.divider}`,
                      color: today ? '#007AFF' : T.text2,
                      fontSize: compact ? 10 : 12, fontWeight:700, letterSpacing:'0.04em',
                      padding: compact ? '2px 10px' : '4px 14px', borderRadius:100,
                    }}>
                      {today && <span style={{ width:6, height:6, borderRadius:'50%', background:'#34C759', boxShadow:'0 0 8px #34C75990', flexShrink:0 }} />}
                      {today ? 'HOJE' : tmrow ? 'AMANHÃ' : fmtDateLabel(date).toUpperCase()}
                    </span>
                    <span style={{ fontSize:11, color: T.text4, fontWeight:500 }}>
                      {gi.length} cirurgia{gi.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ flex:1, height:1, background: T.divider }} />
                  </div>

                  {/* ── Surgery cards ── */}
                  <div style={{ display:'flex', flexDirection:'column', gap: compact ? 3 : 6 }}>
                    {gi.map((item, idx) => {
                      const sc    = item.emergencia ? '#FF3B30' : sColor(item.status)
                      const isEmg = !!item.emergencia
                      const rowPad = compact ? '7px 14px' : '14px 16px'
                      const timeSize = compact ? 16 : 22
                      const cellSize = compact ? 11 : 13
                      const subSize  = compact ? 9  : 10
                      return (
                        <div key={item.id || idx}
                          style={{
                            display:'grid', gridTemplateColumns:COLS, alignItems:'center',
                            background: isEmg ? T.emergBg : (today ? T.todayBg : T.cardBg),
                            border: `1px solid ${isEmg ? T.emergBorder : T.cardBorder}`,
                            borderRadius: compact ? 10 : 16,
                            padding: rowPad,
                            backdropFilter: 'blur(20px) saturate(1.6)',
                            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                            boxShadow: T.shadow,
                            transition: 'background 0.2s',
                            borderLeft: `3px solid ${sc}`,
                          }}>

                          {/* Hora */}
                          <div style={{ paddingRight:10 }}>
                            <span style={{
                              fontFamily:"'SF Mono','Fira Code',monospace",
                              fontSize: timeSize, fontWeight: 600,
                              color: isEmg ? '#FF3B30' : T.timeColor,
                              letterSpacing:'-0.01em', lineHeight:1,
                            }}>
                              {item.horaCirurgia || '—:——'}
                            </span>
                            {isEmg && (
                              <span style={{
                                display:'block', fontSize:8, fontWeight:700, color:'#FF3B30',
                                letterSpacing:'0.08em', marginTop:2, textTransform:'uppercase',
                              }}>⚠ EMERG.</span>
                            )}
                          </div>

                          {/* Hospital */}
                          <GCell text={item.hospital} size={cellSize} weight={600} color={T.text1} />

                          {/* Paciente + Procedimento */}
                          <div style={{ paddingRight:12, minWidth:0 }}>
                            <p style={{ fontSize:cellSize, fontWeight:500, color:T.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {item.paciente || '—'}
                            </p>
                            {item.procedimento && (
                              <p style={{ fontSize:subSize, color:T.text3, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {item.procedimento}
                              </p>
                            )}
                          </div>

                          {/* Médico */}
                          <GCell text={item.medico}           size={compact ? 10 : 11} color={T.text2} />

                          {/* Convênio */}
                          <GCell text={item.convenio}         size={compact ? 10 : 11} color={T.text2} wrap />

                          {/* Vendedor */}
                          <GCell text={item.vendedor}         size={compact ? 10 : 11} color={T.text3} />

                          {/* Instrumentador */}
                          <GCell text={item.instrumentadores} size={compact ? 9 : 10} color={T.text3} wrap />

                          {/* Autorizada */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {item.autorizada
                              ? <span style={{ fontSize: compact ? 13 : 16, color:'#34C759', fontWeight:700, lineHeight:1 }}>✓</span>
                              : <span style={{ fontSize:12, color: T.text4, lineHeight:1 }}>—</span>}
                          </div>

                          {/* Status */}
                          <div>
                            <span style={{
                              display:'inline-flex', alignItems:'center', gap: compact ? 4 : 6,
                              background: `${sc}18`,
                              border: `1px solid ${sc}30`,
                              color: sc,
                              fontSize: compact ? 10 : 11, fontWeight:600,
                              padding: compact ? '3px 8px' : '5px 11px', borderRadius:100,
                              letterSpacing:'0.02em',
                              whiteSpace:'nowrap',
                            }}>
                              <span style={{ width:5, height:5, borderRadius:'50%', background:sc, flexShrink:0 }} />
                              {sLabel(item.status)}
                            </span>
                          </div>

                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══════════════ FOOTER ══════════════ */}
      <div style={{
        background: T.headerBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `1px solid ${T.divider}`,
        flexShrink: 0,
        display: 'flex', alignItems:'center', justifyContent:'space-between',
        padding: '0 28px', height: 36,
      }}>
        <span style={{ fontSize:10, color: T.text4, fontWeight:500, letterSpacing:'0.06em' }}>
          SISTEMA OPME · NOS
        </span>
        <span style={{ fontSize:10, color: T.text4, fontWeight:500 }}>
          {filtered.length} cirurgia{filtered.length !== 1 ? 's' : ''}
          {settings.dateFilter?.mode === 'today'  && ' · somente hoje'}
          {settings.dateFilter?.mode === 'week'   && ' · semana atual'}
          {settings.dateFilter?.mode === 'range'  && ' · intervalo'}
          {settings.hidePast && ' · ocultar passadas'}
          {settings.compact  && ' · modo compacto'}
          {settings.hiddenStatuses.length > 0 && ` · ${settings.hiddenStatuses.length} status oculto${settings.hiddenStatuses.length > 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────── */

function HDivider({ T }: { T: typeof LIGHT }) {
  return <div style={{ width:1, height:36, background: T.divider, flexShrink:0 }} />
}

function KpiCard({ label, value, color, T, glow }: {
  label: string; value: number; color: string; T: typeof LIGHT; glow?: boolean
}) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background: T.kpiCard,
      border: `1px solid ${T.cardBorder}`,
      borderRadius:14, padding:'8px 18px', minWidth:70,
      boxShadow: glow ? `0 4px 16px ${color}25` : T.shadow,
    }}>
      <span style={{ fontSize:32, fontWeight:700, color, lineHeight:1, letterSpacing:'-0.02em',
        textShadow: glow ? `0 0 20px ${color}60` : undefined }}>
        {value}
      </span>
      <span style={{ fontSize:9, color: T.text3, marginTop:3, fontWeight:600,
        textTransform:'uppercase', letterSpacing:'0.08em' }}>
        {label}
      </span>
    </div>
  )
}

function HBtn({ onClick, children, T }: { onClick: () => void; children: React.ReactNode; T: typeof LIGHT }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:5,
      background: T.btnBg,
      border: 'none', borderRadius:10,
      padding:'6px 12px',
      fontSize:11, color: T.btnText, cursor:'pointer', flexShrink:0,
      fontFamily:'inherit', fontWeight:500,
    }}>
      {children}
    </button>
  )
}

function GCell({ text, size, weight, color, wrap }: {
  text?: string; size: number; weight?: number; color: string; wrap?: boolean
}) {
  return (
    <p style={{
      fontSize:size, fontWeight:weight||400, color,
      paddingRight:10, lineHeight:1.4,
      ...(wrap
        ? { whiteSpace:'normal', wordBreak:'break-word' }
        : { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }),
    }} title={text}>
      {text || '—'}
    </p>
  )
}
