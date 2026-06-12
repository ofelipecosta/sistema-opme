import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Trash2, RefreshCw, Download, Table2, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  upsertAgendaItems, clearAgenda, getAgenda,
  parseDate, parseTime, parseStatus, detectColumn
} from '../../utils/agenda-storage'
import { agendaStatusLabel, agendaStatusBg } from '../../utils/agenda-helpers'
import type { AgendaItem } from '../../types/agenda'
import { formatDate } from '../../utils/helpers'

type PreviewRow = Partial<AgendaItem> & { _raw?: Record<string, unknown>; _rowIndex?: number }

const EXPECTED_COLS = [
  { field: 'data', label: 'Data', required: true },
  { field: 'horaCirurgia', label: 'Hora', required: false },
  { field: 'paciente', label: 'Paciente', required: true },
  { field: 'hospital', label: 'Hospital', required: false },
  { field: 'convenio', label: 'Convênio', required: false },
  { field: 'medico', label: 'Médico', required: true },
  { field: 'procedimento', label: 'Procedimento', required: false },
  { field: 'vendedor', label: 'Vendedor', required: false },
  { field: 'status', label: 'Status', required: false },
]

export default function ImportPage() {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [colMap, setColMap] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null)
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([])
  const [existingCount, setExistingCount] = useState(0)
  useEffect(() => { getAgenda().then(a => setExistingCount(a.length)) }, [])

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Selecione um arquivo Excel (.xlsx, .xls) ou CSV')
      return
    }
    setLoading(true)
    setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })

      if (rows.length === 0) { toast.error('Planilha vazia'); return }

      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs)
      setAllRows(rows)

      // Auto-detect column mapping
      const autoMap: Record<string, string> = {}
      for (const h of hdrs) {
        const field = detectColumn(h)
        if (field !== 'skip') autoMap[h] = field
      }
      setColMap(autoMap)
      setPreview(rows.slice(0, 5).map((r, i) => ({ _raw: r, _rowIndex: i })))
      setStep('map')
    } catch (e) {
      toast.error('Erro ao ler o arquivo')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function buildItems(rawRows: Record<string, unknown>[]): AgendaItem[] {
    return rawRows.map(row => {
      const get = (field: string) => {
        const header = Object.keys(colMap).find(h => colMap[h] === field)
        return header ? String(row[header] ?? '') : ''
      }
      const rawStatus = get('status')
      const rawAut = get('autorizada').toLowerCase()
      return {
        id: '',
        codigo: get('codigo'),
        data: parseDate(get('data')),
        horaCirurgia: parseTime(get('horaCirurgia')),
        paciente: get('paciente'),
        hospital: get('hospital'),
        convenio: get('convenio'),
        medico: get('medico'),
        cliente: get('cliente'),
        procedimento: get('procedimento'),
        instrumentadores: get('instrumentadores'),
        vendedor: get('vendedor'),
        autorizada: rawAut === 'sim' || rawAut === 'yes' || rawAut === '1' || rawAut === 'true',
        status: parseStatus(rawStatus),
        importadoEm: new Date().toISOString(),
        importadoPor: user?.nome || '',
        origem: 'importacao',
      } as AgendaItem
    }).filter(r => r.data || r.paciente || r.medico)
  }

  function loadFullPreview() {
    if (!allRows.length) { toast.error('Nenhum dado carregado'); return }
    const items = buildItems(allRows)
    setPreview(items.slice(0, 20).map((item, i) => ({ ...item, _rowIndex: i })))
    setStep('preview')
  }

  async function doImport() {
    if (!allRows.length) return
    setLoading(true)
    try {
      const items = buildItems(allRows)
      const result = await upsertAgendaItems(items)
      setImportResult(result)
      setStep('done')
      toast.success(`${result.added} adicionados, ${result.updated} atualizados`)
      window.dispatchEvent(new CustomEvent('opme_agenda_updated'))
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('upload'); setPreview([]); setHeaders([]); setColMap({}); setFileName(''); setImportResult(null); setAllRows([])
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['CÓD.', 'DATA', 'HORA DA CIRURGIA', 'PACIENTE', 'HOSPITAL', 'CONVÊNIO', 'MÉDICO', 'CLIENTE', 'PROCEDIMENTO', 'INSTRUMENTADORES', 'VENDEDOR', 'AUTORIZADA?', 'STATUS'],
        ['001', '09/06/2026', '19:00', 'NOME DO PACIENTE', 'HOSPITAL EXEMPLO', 'UNIMED', 'DR. NOME', 'CLIENTE LTDA', 'ORTOPEDIA', '', 'VENDEDOR', 'Sim', 'Agendada'],
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Agenda')
      XLSX.writeFile(wb, 'template_agenda_opme.xlsx')
    })
  }

  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Importar Agenda</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Importe sua planilha de agendamento cirúrgico diretamente para o Painel TV
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="btn-secondary btn-sm">
            <Download className="w-4 h-4" /> Modelo Excel
          </button>
          {existingCount > 0 && (
            <button
              onClick={async () => { if (confirm(`Limpar ${existingCount} registros importados?`)) { await clearAgenda(); toast.success('Agenda limpa'); reset() } }}
              className="btn-danger btn-sm"
            >
              <Trash2 className="w-4 h-4" /> Limpar agenda ({existingCount})
            </button>
          )}
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === s ? 'bg-primary-700 text-white' : ['upload','map','preview','done'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {['upload','map','preview','done'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            <span className={step === s ? 'text-primary-700 font-semibold' : 'text-gray-400'}>
              {['Upload', 'Colunas', 'Pré-visualizar', 'Concluído'][i]}
            </span>
            {i < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`card p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-primary-400 bg-primary-50' : 'hover:border-primary-300 hover:bg-gray-50'} border-2 border-dashed`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
          />
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
                <p className="text-sm text-gray-400 mt-1">Suporta .xlsx, .xls e .csv — exportado do seu sistema atual</p>
              </div>
              <p className="text-xs text-gray-400">
                Colunas detectadas automaticamente: DATA, HORA, PACIENTE, HOSPITAL, MÉDICO, VENDEDOR, STATUS…
              </p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Column mapping */}
      {step === 'map' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Mapeamento de Colunas</p>
              <p className="text-sm text-gray-500">Arquivo: <span className="font-medium text-primary-700">{fileName}</span> — {headers.length} colunas detectadas</p>
            </div>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headers.map(h => (
              <div key={h} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1 truncate" title={h}>{h}</p>
                <select
                  className="input text-xs py-1"
                  value={colMap[h] || 'skip'}
                  onChange={e => setColMap(prev => ({ ...prev, [h]: e.target.value }))}
                >
                  <option value="skip">— Ignorar —</option>
                  <option value="codigo">Código</option>
                  <option value="data">Data ✓</option>
                  <option value="horaCirurgia">Hora da Cirurgia</option>
                  <option value="paciente">Paciente ✓</option>
                  <option value="hospital">Hospital</option>
                  <option value="convenio">Convênio</option>
                  <option value="medico">Médico ✓</option>
                  <option value="cliente">Cliente</option>
                  <option value="procedimento">Procedimento</option>
                  <option value="instrumentadores">Instrumentadores</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="autorizada">Autorizada?</option>
                  <option value="status">Status</option>
                </select>
                {/* Preview cell value */}
                <p className="text-xs text-gray-400 mt-1 truncate">
                  Ex: {String(preview[0]?._raw?.[h] ?? '').slice(0, 30)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={loadFullPreview} className="btn-primary" disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Table2 className="w-4 h-4" />}
              Pré-visualizar dados
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Prévia dos primeiros <strong>{preview.length}</strong> registros. Confirme para importar todos.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="btn-secondary btn-sm">Voltar</button>
              <button onClick={doImport} className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar tudo
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {EXPECTED_COLS.filter(c => Object.values(colMap).includes(c.field)).map(c => (
                      <th key={c.field} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{c.label}</th>
                    ))}
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Aut.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {EXPECTED_COLS.filter(c => Object.values(colMap).includes(c.field)).map(c => (
                        <td key={c.field} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                          {c.field === 'data' ? formatDate(String(row[c.field as keyof typeof row] || '')) :
                           String(row[c.field as keyof typeof row] ?? '—').slice(0, 40)}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <span className={`badge text-xs ${agendaStatusBg(row.status!)}`}>
                          {agendaStatusLabel(row.status!)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`badge text-xs ${row.autorizada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.autorizada ? 'Sim' : 'Não'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 'done' && importResult && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Importação concluída!</h3>
          <div className="flex justify-center gap-6 my-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{importResult.added}</p>
              <p className="text-sm text-gray-500">novos registros</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{importResult.updated}</p>
              <p className="text-sm text-gray-500">atualizados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-700">{existingCount + (importResult?.added ?? 0)}</p>
              <p className="text-sm text-gray-500">total na agenda</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">Os dados já estão disponíveis no Painel TV e no Dashboard.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-secondary">
              <Upload className="w-4 h-4" /> Nova importação
            </button>
            <button onClick={() => window.location.href = '/'} className="btn-primary">
              Ver no Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Existing data summary */}
      {step === 'upload' && existingCount > 0 && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Há {existingCount} registros importados na agenda
              </p>
              <p className="text-xs text-blue-600">
                Nova importação atualiza registros existentes e adiciona novos — dados anteriores são preservados.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
