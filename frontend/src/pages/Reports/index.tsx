import { useState, useMemo, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRequisitions } from '../../utils/storage'
import { statusLabel, formatDate, formatDateTime, surgeryTypeLabel } from '../../utils/helpers'
import type { Requisition, RequisitionStatus, SurgeryType } from '../../types'

export default function Reports() {
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')
  const [filterHospital, setFilterHospital] = useState('')
  const [filterConvenio, setFilterConvenio] = useState('')
  const [filterStatus, setFilterStatus] = useState<RequisitionStatus | ''>('')
  const [filterTipo, setFilterTipo] = useState<SurgeryType | ''>('')

  const [allReqs, setAllReqs] = useState<Requisition[]>([])
  useEffect(() => { getRequisitions().then(setAllReqs) }, [])

  const hospitals = useMemo(() => [...new Set(allReqs.map(r => r.hospitalNome).filter(Boolean))].sort(), [allReqs])
  const convenios = useMemo(() => [...new Set(allReqs.map(r => r.cirurgiaConvenio).filter(Boolean))].sort(), [allReqs])

  const filtered = useMemo(() => {
    return allReqs.filter(r => {
      if (filterStatus && r.status !== filterStatus) return false
      if (filterTipo && r.tipoCirurgia !== filterTipo) return false
      if (filterHospital && r.hospitalNome !== filterHospital) return false
      if (filterConvenio && r.cirurgiaConvenio !== filterConvenio) return false
      if (periodoInicio) {
        const d = new Date(r.datasolicitacao)
        if (d < new Date(periodoInicio)) return false
      }
      if (periodoFim) {
        const d = new Date(r.datasolicitacao)
        if (d > new Date(periodoFim + 'T23:59:59')) return false
      }
      return true
    })
  }, [allReqs, filterStatus, filterTipo, filterHospital, filterConvenio, periodoInicio, periodoFim])

  async function exportExcel() {
    try {
      const XLSX = await import('xlsx')
      const data = filtered.map(r => ({
        'Número': r.numero,
        'Tipo': surgeryTypeLabel(r.tipoCirurgia),
        'Status': statusLabel(r.status),
        'Data Solicitação': formatDate(r.datasolicitacao),
        'Paciente': r.pacienteNome,
        'Prontuário': r.pacienteProntuario,
        'Hospital': r.hospitalNome,
        'Cidade': r.hospitalCidade,
        'Estado': r.hospitalEstado,
        'Médico': r.medicoNome,
        'Especialidade': r.medicoEspecialidade,
        'Procedimento': r.cirurgiaProcedimento,
        'Data Cirurgia': r.cirurgiaData ? formatDate(r.cirurgiaData) : '-',
        'Horário': r.cirurgiaHorario,
        'Convênio': r.cirurgiaConvenio,
        'Código TUSS': r.cirurgiaCodTUSS,
        'Vendedor': r.vendedorNome,
        'Qtd Materiais': r.materiais.length,
        'Solicitante': r.solicitanteNome,
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Requisições OPME')
      XLSX.writeFile(wb, `Relatorio_OPME_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel exportado com sucesso!')
    } catch {
      toast.error('Erro ao exportar Excel')
    }
  }

  async function exportPDF() {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      doc.setFillColor(30, 58, 95)
      doc.rect(0, 0, 297, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Sistema OPME — NOS', 14, 13)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Relatório de Requisições — Gerado em ${formatDateTime(new Date().toISOString())}`, 150, 13)

      autoTable(doc, {
        startY: 25,
        head: [['Número', 'Tipo', 'Status', 'Paciente', 'Hospital', 'Médico', 'Procedimento', 'Cirurgia', 'Convênio', 'Vendedor']],
        body: filtered.map(r => [
          r.numero, surgeryTypeLabel(r.tipoCirurgia), statusLabel(r.status),
          r.pacienteNome, r.hospitalNome, r.medicoNome, r.cirurgiaProcedimento,
          r.cirurgiaData ? formatDate(r.cirurgiaData) : '-', r.cirurgiaConvenio, r.vendedorNome
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        foot: [[`Total: ${filtered.length} requisições`, '', '', '', '', '', '', '', '', '']],
        footStyles: { fillColor: [240, 247, 255], textColor: [30, 58, 95], fontStyle: 'bold' },
      })

      doc.save(`Relatorio_OPME_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF exportado com sucesso!')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao exportar PDF')
    }
  }

  const STATUS_OPTIONS: RequisitionStatus[] = ['rascunho', 'enviada', 'em_analise', 'aprovada', 'separacao_material', 'material_enviado', 'finalizada', 'cancelada']

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-gray-700">Filtros do Relatório</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="label text-xs">Data Início</label>
            <input type="date" className="input text-sm" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Data Fim</label>
            <input type="date" className="input text-sm" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Hospital</label>
            <select className="input text-sm" value={filterHospital} onChange={e => setFilterHospital(e.target.value)}>
              <option value="">Todos</option>
              {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Convênio</label>
            <select className="input text-sm" value={filterConvenio} onChange={e => setFilterConvenio(e.target.value)}>
              <option value="">Todos</option>
              {convenios.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
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
        </div>
      </div>

      {/* Summary + export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">{filtered.length}</span> requisições encontradas
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel} className="btn-success">
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
          <button onClick={exportPDF} className="btn-primary">
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Preview table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pré-visualização ({filtered.length} registros)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Número</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Tipo</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Paciente</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Hospital</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Médico</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Procedimento</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Cirurgia</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Convênio</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 50).map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{r.numero}</td>
                  <td className="px-4 py-2">{surgeryTypeLabel(r.tipoCirurgia)}</td>
                  <td className="px-4 py-2">
                    <span className={`badge text-xs ${r.status === 'finalizada' ? 'bg-teal-100 text-teal-700' : r.status === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-[120px] truncate">{r.pacienteNome}</td>
                  <td className="px-4 py-2 max-w-[130px] truncate">{r.hospitalNome}</td>
                  <td className="px-4 py-2 max-w-[120px] truncate">{r.medicoNome}</td>
                  <td className="px-4 py-2 max-w-[150px] truncate">{r.cirurgiaProcedimento}</td>
                  <td className="px-4 py-2">{r.cirurgiaData ? formatDate(r.cirurgiaData) : '-'}</td>
                  <td className="px-4 py-2">{r.cirurgiaConvenio || '-'}</td>
                  <td className="px-4 py-2 max-w-[100px] truncate">{r.vendedorNome}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <p className="text-center text-xs text-gray-400 py-3">
              Exibindo 50 de {filtered.length} registros. Use a exportação para ver todos.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
