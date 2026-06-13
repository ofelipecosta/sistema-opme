import { useState, useRef, useEffect } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Trash2, RefreshCw, Download, Table2, X, CalendarDays, ClipboardList,
  History, ChevronDown, ChevronRight, Plus, RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  upsertAgendaItems, clearAgenda, getAgenda,
  parseDate, parseTime, parseStatus, detectColumn,
} from '../../utils/agenda-storage'
import { agendaStatusLabel, agendaStatusBg } from '../../utils/agenda-helpers'
import type { AgendaItem } from '../../types/agenda'
import { formatDate, formatDateTime } from '../../utils/helpers'
import { bulkUpsertControleCirurgias, clearControleCirurgias, countControleCirurgias } from '../../utils/controle-storage'
import type { ControleCirurgia, SegmentoCirurgia, SituacaoCirurgia, AcompanhamentoCirurgia } from '../../types/controle'
import { SEGMENTO_LABELS, SITUACAO_LABELS, ACOMPANHAMENTO_LABELS } from '../../types/controle'
import { saveImportLog, getImportLogs, deleteImportLog, type ImportLog } from '../../utils/import-logs'

// ─── helpers ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done'
type Mode = 'agenda' | 'controle'

const AGENDA_COLS = [
  { field: 'codigo',          label: 'Cód.',            required: false },
  { field: 'data',            label: 'Data',            required: true  },
  { field: 'horaCirurgia',    label: 'Hora',            required: false },
  { field: 'paciente',        label: 'Paciente',        required: true  },
  { field: 'hospital',        label: 'Hospital',        required: false },
  { field: 'convenio',        label: 'Convênio',        required: false },
  { field: 'medico',          label: 'Médico',          required: true  },
  { field: 'cliente',         label: 'Cliente',         required: false },
  { field: 'procedimento',    label: 'Procedimento',    required: false },
  { field: 'instrumentadores',label: 'Instrumentadores',required: false },
  { field: 'vendedor',        label: 'Vendedor',        required: false },
  { field: 'autorizada',      label: 'Autorizada?',     required: false },
  { field: 'status',          label: 'Status',          required: false },
]

const CONTROLE_COLS = [
  { field: 'numero',          label: 'Nº',              required: false },
  { field: 'codigoV2',        label: 'Cód. V2',         required: false },
  { field: 'data',            label: 'Data',            required: true  },
  { field: 'cirurgia',        label: 'Cirurgia',        required: true  },
  { field: 'segmento',        label: 'Segmento',        required: true  },
  { field: 'pacienteNome',    label: 'Nome',            required: true  },
  { field: 'convenio',        label: 'Convênio',        required: false },
  { field: 'hospital',        label: 'Hospital',        required: false },
  { field: 'medico',          label: 'Médico',          required: false },
  { field: 'vendedor',        label: 'Vendedor',        required: false },
  { field: 'situacao',        label: 'Situação',        required: false },
  { field: 'acompanhamento',  label: 'Acompanhamento',  required: false },
  { field: 'observacao',      label: 'Obs./Coluna extra', required: false },
]

function detectControleColumn(header: string): string {
  const h = header.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  // 'v2' deve ser checado ANTES de 'cod' para evitar conflito com coluna "CÓD." (numero)
  if (h.includes('v2'))                                            return 'codigoV2'
  if (/^n[oº]?$/.test(h) || h === 'numero' || h === 'n.')        return 'numero'
  if (/^cod\.?$/.test(h))                                         return 'numero'  // "CÓD." sem v2 → é o Nº
  if (h === 'data' || h.startsWith('data'))                       return 'data'
  if (h.includes('cirurgia') || h.includes('procedimento'))       return 'cirurgia'
  if (h === 'segmento')                                           return 'segmento'
  if (h.includes('nome') || h === 'paciente')                     return 'pacienteNome'
  if (h.includes('convenio') || h.includes('plano'))              return 'convenio'
  if (h.includes('hospital'))                                     return 'hospital'
  if (h.includes('medico'))                                       return 'medico'
  if (h.includes('vendedor'))                                     return 'vendedor'
  if (h.includes('situacao'))                                     return 'situacao'
  if (h.includes('acompanhamento'))                               return 'acompanhamento'
  if (/^(coluna\d*|__empty\d*|sem.?nome|column\d*)$/.test(h))    return 'observacao'
  return 'skip'
}

function parseSegmento(v: string): SegmentoCirurgia {
  const s = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('trauma'))    return 'trauma'
  if (s.includes('neuro'))     return 'neuro'
  if (s.includes('coluna'))    return 'coluna'
  return 'ortopedia'
}

function parseSituacao(v: string): SituacaoCirurgia {
  const s = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('autorizada')) return 'autorizada'
  if (s.includes('expedida'))   return 'expedida'
  return 'urgencia'
}

function parseAcompanhamento(v: string): AcompanhamentoCirurgia {
  const s = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('cancelada') || s.includes('cancelado')) return 'cancelada'
  if (s.includes('expedida'))  return 'expedida'
  if (s.includes('agendada'))  return 'agendada'
  if (s.includes('opme'))      return 'opme_pos'
  return 'agendada'
}

// ─── Shared upload area ───────────────────────────────────────────────────────

function UploadArea({ onFile, loading }: { onFile: (f: File) => void; loading: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => fileRef.current?.click()}
      className={`card p-12 text-center cursor-pointer transition-colors border-2 border-dashed ${dragging ? 'border-primary-400 bg-primary-50' : 'hover:border-primary-300 hover:bg-gray-50'}`}
    >
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
          <p className="text-gray-600">Lendo arquivo…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 text-lg">Arraste o Excel aqui ou clique para selecionar</p>
            <p className="text-sm text-gray-400 mt-1">Suporta .xlsx, .xls e .csv</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Steps indicator ──────────────────────────────────────────────────────────

function StepsBar({ step }: { step: Step }) {
  const steps: Step[] = ['upload', 'map', 'preview', 'done']
  const labels = ['Upload', 'Colunas', 'Prévia', 'Concluído']
  const cur = steps.indexOf(step)
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${cur === i ? 'bg-primary-700 text-white' : cur > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {cur > i ? '✓' : i + 1}
          </div>
          <span className={cur === i ? 'text-primary-700 font-semibold' : 'text-gray-400'}>{labels[i]}</span>
          {i < 3 && <div className="w-8 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  )
}

// ─── Agenda import flow ───────────────────────────────────────────────────────

function AgendaImport() {
  const { user } = useAuth()
  const [loading, setLoading]           = useState(false)
  const [progress, setProgress]         = useState(0)
  const [step, setStep]                 = useState<Step>('upload')
  const [headers, setHeaders]           = useState<string[]>([])
  const [colMap, setColMap]             = useState<Record<string, string>>({})
  const [allRows, setAllRows]           = useState<Record<string, unknown>[]>([])
  const [preview, setPreview]           = useState<Partial<AgendaItem>[]>([])
  const [fileName, setFileName]         = useState('')
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null)
  const [existingCount, setExistingCount] = useState(0)
  useEffect(() => { getAgenda().then(a => setExistingCount(a.length)) }, [])

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error('Selecione .xlsx, .xls ou .csv'); return }
    setLoading(true); setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true })
      if (!rows.length) { toast.error('Planilha vazia'); return }
      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs); setAllRows(rows)
      const auto: Record<string, string> = {}
      for (const h of hdrs) { const f = detectColumn(h); if (f !== 'skip') auto[h] = f }
      setColMap(auto)
      setPreview(rows.slice(0, 3).map(r => ({ _raw: r } as any)))
      setStep('map')
    } catch { toast.error('Erro ao ler o arquivo') } finally { setLoading(false) }
  }

  function buildItems(rows: Record<string, unknown>[]): AgendaItem[] {
    const get = (field: string, row: Record<string, unknown>) => {
      const h = Object.keys(colMap).find(k => colMap[k] === field)
      return h ? String(row[h] ?? '') : ''
    }
    return rows.map(row => ({
      id: '', codigo: get('codigo', row),
      data: parseDate(get('data', row)), horaCirurgia: parseTime(get('horaCirurgia', row)),
      paciente: get('paciente', row), hospital: get('hospital', row), convenio: get('convenio', row),
      medico: get('medico', row), cliente: get('cliente', row), procedimento: get('procedimento', row),
      instrumentadores: get('instrumentadores', row), vendedor: get('vendedor', row),
      autorizada: ['sim','yes','1','true'].includes(get('autorizada', row).toLowerCase()),
      status: parseStatus(get('status', row)),
      importadoEm: new Date().toISOString(), importadoPor: user?.nome || '', origem: 'importacao',
    } as AgendaItem)).filter(r => r.data || r.paciente || r.medico)
  }

  function loadPreview() {
    setPreview(buildItems(allRows).slice(0, 20))
    setStep('preview')
  }

  async function doImport() {
    setLoading(true); setProgress(0)
    try {
      const result = await upsertAgendaItems(buildItems(allRows), p => setProgress(p))
      setProgress(100); setImportResult(result); setStep('done')
      toast.success(`${result.added} adicionados, ${result.updated} atualizados`)
      window.dispatchEvent(new CustomEvent('opme_agenda_updated'))
      await saveImportLog({
        usuarioId: user?.id, usuarioNome: user?.nome,
        modo: 'agenda', arquivo: fileName,
        totalLinhas: allRows.length,
        adicionados: result.added, atualizados: result.updated,
        detalhes: result.details,
      })
    } finally { setLoading(false) }
  }

  function reset() { setStep('upload'); setPreview([]); setHeaders([]); setColMap({}); setFileName(''); setImportResult(null); setAllRows([]) }

  function downloadTemplate() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['CÓD.','DATA','HORA DA CIRURGIA','PACIENTE','HOSPITAL','CONVÊNIO','MÉDICO','CLIENTE','PROCEDIMENTO','INSTRUMENTADORES','VENDEDOR','AUTORIZADA?','STATUS'],
        ['001','09/06/2026','19:00','NOME DO PACIENTE','HOSPITAL EXEMPLO','UNIMED','DR. NOME','UNIMED NOVA IGUAÇU COOP','ORTOPEDIA','ALBERTO LEOBINO','VENDEDOR NOME','Sim','Agendada'],
      ])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Agenda')
      XLSX.writeFile(wb, 'template_agenda_opme.xlsx')
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadTemplate} className="btn-secondary btn-sm"><Download className="w-4 h-4" /> Modelo Excel</button>
        {existingCount > 0 && (
          <button onClick={async () => { if (confirm(`Limpar ${existingCount} registros?`)) { await clearAgenda(); toast.success('Agenda limpa'); reset() } }} className="btn-danger btn-sm">
            <Trash2 className="w-4 h-4" /> Limpar agenda ({existingCount})
          </button>
        )}
      </div>

      <StepsBar step={step} />

      {step === 'upload' && (
        <>
          <UploadArea onFile={processFile} loading={loading} />
          {existingCount > 0 && (
            <div className="card p-4 bg-blue-50 border-blue-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">Há <strong>{existingCount}</strong> registros na agenda. Nova importação adiciona/atualiza sem apagar.</p>
            </div>
          )}
        </>
      )}

      {step === 'map' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">Mapeamento de colunas — <span className="text-primary-600 font-medium">{fileName}</span></p>
            <button onClick={reset}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headers.map(h => (
              <div key={h} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1 truncate">{h}</p>
                <select className="input text-xs py-1" value={colMap[h] || 'skip'} onChange={e => setColMap(p => ({ ...p, [h]: e.target.value }))}>
                  <option value="skip">— Ignorar —</option>
                  {AGENDA_COLS.map(c => <option key={c.field} value={c.field}>{c.label}{c.required ? ' ✓' : ''}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1 truncate">Ex: {String((preview[0] as any)?._raw?.[h] ?? '').slice(0, 30)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={loadPreview} className="btn-primary" disabled={loading}><Table2 className="w-4 h-4" /> Pré-visualizar</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600">Prévia de <strong>{preview.length}</strong> registros</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="btn-secondary btn-sm" disabled={loading}>Voltar</button>
              <button onClick={doImport} className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar tudo ({allRows.length})
              </button>
            </div>
          </div>
          {loading && (
            <div className="card p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Importando {allRows.length} registros…</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #007AFF, #5AC8FA)' }} />
              </div>
              <p className="text-xs text-gray-400">
                {progress < 20 ? 'Carregando registros existentes…'
                  : progress < 40 ? 'Comparando e preparando dados…'
                  : progress < 95 ? 'Salvando no banco de dados…'
                  : 'Finalizando…'}
              </p>
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {AGENDA_COLS.filter(c => Object.values(colMap).includes(c.field) && c.field !== 'status').map(c => (
                    <th key={c.field} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{c.label}</th>
                  ))}
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {AGENDA_COLS.filter(c => Object.values(colMap).includes(c.field) && c.field !== 'status').map(c => (
                        <td key={c.field} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate">
                          {c.field === 'data'
                            ? formatDate(String(row[c.field as keyof typeof row] || ''))
                            : c.field === 'autorizada'
                              ? (row.autorizada ? 'Sim' : 'Não')
                              : String(row[c.field as keyof typeof row] ?? '—').slice(0, 40)}
                        </td>
                      ))}
                      <td className="px-3 py-2"><span className={`badge text-xs ${agendaStatusBg(row.status!)}`}>{agendaStatusLabel(row.status!)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && importResult && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Agenda importada!</h3>
          <div className="flex justify-center gap-8 my-4">
            <div><p className="text-3xl font-bold text-green-600">{importResult.added}</p><p className="text-sm text-gray-500">novos</p></div>
            <div><p className="text-3xl font-bold text-blue-600">{importResult.updated}</p><p className="text-sm text-gray-500">atualizados</p></div>
          </div>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={reset} className="btn-secondary"><Upload className="w-4 h-4" /> Nova importação</button>
            <button onClick={() => window.location.href = '/'} className="btn-primary">Ver Dashboard</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Controle import flow ─────────────────────────────────────────────────────

function ControleImport() {
  const { user } = useAuth()
  const [loading, setLoading]           = useState(false)
  const [progress, setProgress]         = useState(0)
  const [step, setStep]                 = useState<Step>('upload')
  const [headers, setHeaders]           = useState<string[]>([])
  const [colMap, setColMap]             = useState<Record<string, string>>({})
  const [allRows, setAllRows]           = useState<Record<string, unknown>[]>([])
  const [preview, setPreview]           = useState<Partial<ControleCirurgia>[]>([])
  const [fileName, setFileName]         = useState('')
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null)
  const [existingCount, setExistingCount] = useState(0)
  useEffect(() => { countControleCirurgias().then(setExistingCount) }, [])

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error('Selecione .xlsx, .xls ou .csv'); return }
    setLoading(true); setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })

      // Tenta ler a aba do mês atual ou a primeira aba disponível
      // Lê todas as abas (ignora abas de configuração) e combina as linhas
      const ignorar = ['dados', 'config', 'configuracao', 'resumo', 'total']
      const abas = wb.SheetNames.filter(n => !ignorar.includes(n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')))
      const rows: Record<string, unknown>[] = abas.flatMap(aba =>
        XLSX.utils.sheet_to_json(wb.Sheets[aba], { defval: '', raw: true }) as Record<string, unknown>[]
      )
      if (!rows.length) { toast.error('Planilha vazia'); return }

      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs); setAllRows(rows)
      const auto: Record<string, string> = {}
      for (const h of hdrs) { const f = detectControleColumn(h); if (f !== 'skip') auto[h] = f }
      setColMap(auto)
      setPreview(rows.slice(0, 3).map(r => ({ _raw: r } as any)))
      setStep('map')
    } catch { toast.error('Erro ao ler o arquivo') } finally { setLoading(false) }
  }

  function buildItems(rows: Record<string, unknown>[]): Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt'>[] {
    const get = (field: string, row: Record<string, unknown>) => {
      const h = Object.keys(colMap).find(k => colMap[k] === field)
      return h ? String(row[h] ?? '').trim() : ''
    }
    return rows.map(row => {
      const obs      = get('observacao', row)
      const acompRaw = get('acompanhamento', row)
      // Se a coluna extra (Coluna1) contém CANCELADA, usa como acompanhamento
      const isCancelada = /cancelad/i.test(obs)
      return {
        numero:         get('numero', row) || undefined,
        codigoV2:       get('codigoV2', row) || undefined,
        data:           parseDate(get('data', row)),
        cirurgia:       get('cirurgia', row).toUpperCase(),
        segmento:       parseSegmento(get('segmento', row)),
        pacienteNome:   get('pacienteNome', row).toUpperCase(),
        convenio:       get('convenio', row) || undefined,
        hospital:       get('hospital', row) || undefined,
        medico:         get('medico', row) || undefined,
        vendedor:       get('vendedor', row) || undefined,
        situacao:       parseSituacao(get('situacao', row)),
        acompanhamento: isCancelada ? 'cancelada' : parseAcompanhamento(acompRaw),
        observacao:     obs || undefined,
        criadoPorId:    user?.id,
        criadoPorNome:  user?.nome,
      }
    }).filter(r => r.data && r.pacienteNome)
  }

  function loadPreview() {
    setPreview(buildItems(allRows).slice(0, 20))
    setStep('preview')
  }

  async function doImport() {
    setLoading(true); setProgress(0)
    try {
      const items = buildItems(allRows)
      const result = await bulkUpsertControleCirurgias(items, p => setProgress(p))
      setProgress(100); setImportResult(result); setStep('done')
      toast.success(`${result.added} adicionados, ${result.updated} atualizados`)
      await saveImportLog({
        usuarioId: user?.id, usuarioNome: user?.nome,
        modo: 'controle', arquivo: fileName,
        totalLinhas: allRows.length,
        adicionados: result.added, atualizados: result.updated,
        detalhes: result.details,
      })
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar')
    } finally { setLoading(false) }
  }

  function reset() { setStep('upload'); setPreview([]); setHeaders([]); setColMap({}); setFileName(''); setAllRows([]); setImportResult(null) }

  async function handleClear() {
    if (!confirm(`Limpar todos os ${existingCount} registros do Controle de Cirurgias?`)) return
    await clearControleCirurgias()
    setExistingCount(0)
    toast.success('Controle de Cirurgias limpo')
    reset()
  }

  function downloadTemplate() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Nº','CÓD. V2','Data','Cirurgia','Segmento','Nome','Convênio','Hospital','Médico','Vendedor','Situação','ACOMPANHAMENTO',''],
        ['1','385515','01/06/2026','FRATURA DE FÊMUR','Ortopedia','NOME DO PACIENTE','BRADESCO','NITERÓI DOR','DR. MARCELO','ALBERTO','Urgência','OPME Pós',''],
        ['2','385516','02/06/2026','ARTICULAR DO PUNHO','Trauma','OUTRO PACIENTE','UNIMED','NITERÓI DOR','DR. MARCELO','ALBERTO','Autorizada','Agendada','CANCELADA'],
      ])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Junho')
      XLSX.writeFile(wb, 'template_controle_cirurgias.xlsx')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadTemplate} className="btn-secondary btn-sm"><Download className="w-4 h-4" /> Modelo Excel</button>
        {existingCount > 0 && (
          <button onClick={handleClear} className="btn-danger btn-sm">
            <Trash2 className="w-4 h-4" /> Limpar controle ({existingCount})
          </button>
        )}
      </div>

      <StepsBar step={step} />

      {step === 'upload' && (
        <>
          <UploadArea onFile={processFile} loading={loading} />
          <div className="card p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <strong>Formato esperado:</strong> Nº · CÓD.V2 · Data · Cirurgia · Segmento · Nome · Convênio · Hospital · Médico · Vendedor · Situação · Acompanhamento.
              <br />A planilha "Controle de Cirurgias 2026" já está no formato correto — basta fazer o upload de qualquer aba mensal.
            </div>
          </div>
        </>
      )}

      {step === 'map' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">Mapeamento de colunas — <span className="text-primary-600 font-medium">{fileName}</span></p>
            <button onClick={reset}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headers.map(h => (
              <div key={h} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1 truncate">{h}</p>
                <select className="input text-xs py-1" value={colMap[h] || 'skip'} onChange={e => setColMap(p => ({ ...p, [h]: e.target.value }))}>
                  <option value="skip">— Ignorar —</option>
                  {CONTROLE_COLS.map(c => <option key={c.field} value={c.field}>{c.label}{c.required ? ' ✓' : ''}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1 truncate">Ex: {String((preview[0] as any)?._raw?.[h] ?? '').slice(0, 30)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={loadPreview} className="btn-primary" disabled={loading}><Table2 className="w-4 h-4" /> Pré-visualizar</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600">Prévia de <strong>{preview.length}</strong> registros</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="btn-secondary btn-sm" disabled={loading}>Voltar</button>
              <button onClick={doImport} className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar tudo ({allRows.length})
              </button>
            </div>
          </div>
          {loading && (
            <div className="card p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Importando {allRows.length} registros…</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #FF9500, #FF6B00)' }} />
              </div>
              <p className="text-xs text-gray-400">
                {progress < 20 ? 'Carregando registros existentes…'
                  : progress < 35 ? 'Comparando e preparando dados…'
                  : progress < 95 ? 'Salvando no banco de dados…'
                  : 'Finalizando…'}
              </p>
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {['Cód. V2','Data','Cirurgia','Segmento','Nome','Convênio','Hospital','Médico','Vendedor','Situação','Acomp.'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.codigoV2 || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.data || '')}</td>
                      <td className="px-3 py-2 min-w-[140px]">{row.cirurgia || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.segmento ? SEGMENTO_LABELS[row.segmento] : '—'}</td>
                      <td className="px-3 py-2 min-w-[160px]">{row.pacienteNome || '—'}</td>
                      <td className="px-3 py-2 min-w-[100px]">{row.convenio || '—'}</td>
                      <td className="px-3 py-2 min-w-[120px]">{row.hospital || '—'}</td>
                      <td className="px-3 py-2 min-w-[120px]">{row.medico || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.vendedor || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.situacao ? SITUACAO_LABELS[row.situacao] : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.acompanhamento ? ACOMPANHAMENTO_LABELS[row.acompanhamento] : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && importResult && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Controle importado!</h3>
          <div className="flex justify-center gap-8 my-4">
            <div><p className="text-3xl font-bold text-green-600">{importResult.added}</p><p className="text-sm text-gray-500">novos</p></div>
            <div><p className="text-3xl font-bold text-blue-600">{importResult.updated}</p><p className="text-sm text-gray-500">atualizados</p></div>
          </div>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={reset} className="btn-secondary"><Upload className="w-4 h-4" /> Nova importação</button>
            <button onClick={() => window.location.href = '/controle'} className="btn-primary">Ver Controle</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Import Log History ───────────────────────────────────────────────────────

function ImportHistory() {
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { getImportLogs().then(l => { setLogs(l); setLoading(false) }) }, [])

  async function handleDelete(id: string) {
    if (!confirm('Remover este registro do histórico?')) return
    await deleteImportLog(id)
    setLogs(l => l.filter(x => x.id !== id))
    toast.success('Registro removido')
  }

  const FIELD_LABELS: Record<string, string> = {
    data: 'Data', horaCirurgia: 'Hora', paciente: 'Paciente', hospital: 'Hospital',
    convenio: 'Convênio', medico: 'Médico', cliente: 'Cliente', procedimento: 'Procedimento',
    instrumentadores: 'Instrumentador', vendedor: 'Vendedor', autorizada: 'Autorizada',
    status: 'Status', cirurgia: 'Cirurgia', segmento: 'Segmento', situacao: 'Situação',
    acompanhamento: 'Acompanhamento', convenio2: 'Convênio',
  }

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>
  if (!logs.length) return (
    <div className="card p-10 text-center">
      <History className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-400">Nenhuma importação registrada ainda.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const isOpen = expanded === log.id
        const added   = log.detalhes?.filter(d => d.acao === 'adicionado') ?? []
        const updated = log.detalhes?.filter(d => d.acao === 'atualizado' && (d.campos?.length ?? 0) > 0) ?? []
        return (
          <div key={log.id} className="card overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpanded(isOpen ? null : log.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${log.modo === 'agenda' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                {log.modo === 'agenda'
                  ? <CalendarDays className="w-4 h-4 text-blue-600" />
                  : <ClipboardList className="w-4 h-4 text-orange-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-800 truncate">{log.arquivo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.modo === 'agenda' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {log.modo === 'agenda' ? 'Agenda' : 'Controle'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                  {log.usuarioNome && <span className="text-xs text-gray-400">por {log.usuarioNome}</span>}
                  <span className="text-xs font-medium text-green-600">+{log.adicionados} novos</span>
                  <span className="text-xs font-medium text-blue-600">↻ {log.atualizados} atualizados</span>
                  <span className="text-xs text-gray-400">{log.totalLinhas} linhas</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); handleDelete(log.id) }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {/* Expanded details */}
            {isOpen && log.detalhes && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                {added.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> {added.length} Adicionados
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {added.slice(0, 50).map((d, i) => (
                        <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{d.identificador || '—'}</span>
                      ))}
                      {added.length > 50 && <span className="text-xs text-gray-400">+{added.length - 50} mais</span>}
                    </div>
                  </div>
                )}
                {updated.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> {updated.length} Atualizados (com alterações)
                    </p>
                    <div className="space-y-1">
                      {updated.slice(0, 30).map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="font-medium text-gray-700 min-w-[140px] truncate">{d.identificador || '—'}</span>
                          <span className="text-gray-400">
                            {d.campos?.map(f => FIELD_LABELS[f] || f).join(', ')}
                          </span>
                        </div>
                      ))}
                      {updated.length > 30 && <p className="text-xs text-gray-400">+{updated.length - 30} mais…</p>}
                    </div>
                  </div>
                )}
                {added.length === 0 && updated.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Nenhuma alteração detectada nesta importação.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [mode, setMode] = useState<Mode | null>(null)
  const [tab, setTab] = useState<'importar' | 'historico'>('importar')

  if (!mode) {
    return (
      <div className="max-w-3xl space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['importar', 'historico'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'importar' ? <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Importar</span>
                               : <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Histórico</span>}
            </button>
          ))}
        </div>

        {tab === 'historico' ? <ImportHistory /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Agenda */}
          <button onClick={() => setMode('agenda')}
            className="card p-6 text-left hover:border-primary-300 transition-colors group border-2 border-transparent hover:bg-blue-50/40">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <CalendarDays className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Importar Agenda</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Importe a planilha de agendamento cirúrgico para o Painel TV e Dashboard.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Campos: Data · Hora · Paciente · Hospital · Médico · Vendedor · Status…
            </p>
          </button>

          {/* Controle */}
          <button onClick={() => setMode('controle')}
            className="card p-6 text-left hover:border-orange-300 transition-colors group border-2 border-transparent hover:bg-orange-50/40">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
              <ClipboardList className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Importar Controle de Cirurgias</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Importe a planilha "Controle de Cirurgias" diretamente para o módulo de controle.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Campos: Nº · Cód.V2 · Cirurgia · Segmento · Situação · Acompanhamento…
            </p>
          </button>
        </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMode(null)}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors">
          ← Voltar
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          {mode === 'agenda'
            ? <CalendarDays className="w-5 h-5 text-blue-600" />
            : <ClipboardList className="w-5 h-5" style={{ color: '#c02020' }} />}
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'agenda' ? 'Importar Agenda' : 'Importar Controle de Cirurgias'}
          </h2>
        </div>
      </div>

      {mode === 'agenda'    && <AgendaImport />}
      {mode === 'controle'  && <ControleImport />}
    </div>
  )
}
