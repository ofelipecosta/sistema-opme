import { useState, useEffect, useCallback } from 'react'
import {
  Search, Printer, Package, ChevronDown, ChevronUp,
  Calendar, User, Building2, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, FileText, History, X, Trash2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getRequisitions, deleteRequisition, getRequisitionById } from '../../utils/storage'
import { formatDate } from '../../utils/helpers'
import {
  getSeparacoes, getSeparacaoByReq, getHistoricoSeparacao, registrarSeparacao,
} from '../../utils/separacao-storage'
import { emailSeparacaoConfirmada } from '../../utils/email-service'
import type { Requisition, OPMEItem, SeparacaoRecord } from '../../types'

/* ─── Shared print styles ────────────────────────────────────────────── */
const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`

/* ─── 80mm thermal receipt ───────────────────────────────────────────── */
function buildCupom80(req: Requisition, sep: SeparacaoRecord | null, isReprint: boolean): string {
  const items: OPMEItem[] = req.materiais ?? []
  const totalQty = items.reduce((s, i) => s + Number(i.quantidade), 0)
  const emerg = req.tipoCirurgia === 'emergencia'
  const now = new Date()
  const stamp = now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const via = sep ? sep.via + (isReprint ? 0 : 0) : 1

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  ${BASE_STYLES}
  @page { size: 80mm auto; margin: 2mm 0; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 76mm; padding: 3mm 4mm; color: #000; background: #fff; }
  .c  { text-align: center; }
  .b  { font-weight: bold; }
  .sm { font-size: 9px; }
  .lg { font-size: 13px; }
  .hr { border: none; border-top: 1px dashed #000; margin: 2.5mm 0; }
  .row { display: flex; justify-content: space-between; gap: 2mm; margin-bottom: 1mm; }
  .row .v { text-align: right; font-weight: bold; max-width: 44mm; word-break: break-word; }
  .item { margin-bottom: 3mm; }
  .item-name { font-weight: bold; font-size: 11px; margin: 1mm 0; }
  .item-sub  { font-size: 9px; color: #333; }
  .item-qty  { display: flex; justify-content: space-between; margin-top: 1mm; }
  .badge-emerg { display: block; text-align: center; background: #000; color: #fff; padding: 1.5mm; font-size: 10px; font-weight: bold; margin: 2mm 0; }
  .badge-reprint { display: block; text-align: center; border: 2px solid #000; padding: 1.5mm; font-size: 10px; font-weight: bold; margin: 2mm 0; }
  .sig { border-top: 1px solid #000; width: 48mm; margin: 2mm auto 0; }
  .total-line { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
</style></head><body>

<div class="c b lg">SISTEMA OPME · NOS</div>
<div class="c sm">Separação de Materiais</div>
<hr class="hr"/>

${isReprint ? `<div class="badge-reprint">📋 ${via}ª VIA — JÁ SEPARADO</div>` : ''}
${emerg ? `<div class="badge-emerg">⚠ EMERGÊNCIA</div>` : ''}

<div class="b">REQ: ${req.numero}</div>
<div class="sm">${stamp}</div>
<hr class="hr"/>

<div class="row"><span>Data:</span><span class="v">${req.cirurgiaData ? formatDate(req.cirurgiaData) : '—'}</span></div>
<div class="row"><span>Horário:</span><span class="v">${req.cirurgiaHorario || '—'}</span></div>
<div class="row"><span>Hospital:</span><span class="v">${req.hospitalNome || '—'}</span></div>
${req.cirurgiaSala ? `<div class="row"><span>Sala:</span><span class="v">${req.cirurgiaSala}</span></div>` : ''}
<div class="row"><span>Paciente:</span><span class="v">${req.pacienteNome || '—'}</span></div>
<div class="row"><span>Médico:</span><span class="v">${req.medicoNome || '—'}</span></div>
<div class="row"><span>Procedimento:</span><span class="v">${req.cirurgiaProcedimento || '—'}</span></div>
<div class="row"><span>Convênio:</span><span class="v">${req.cirurgiaConvenio || '—'}</span></div>
<hr class="hr"/>

<div class="c b" style="margin-bottom:2mm">─── MATERIAIS (${items.length}) ───</div>

${items.length === 0
  ? `<div class="c sm">Nenhum material cadastrado</div>`
  : items.map((it, idx) => `
<div class="item">
  <div class="sm">${idx + 1}. ${it.codigo ? `[${it.codigo}]` : ''}</div>
  <div class="item-name">${it.descricao}</div>
  ${it.fabricante ? `<div class="item-sub">Fab: ${it.fabricante}</div>` : ''}
  <div class="item-qty"><span class="sm">${it.unidade || 'UN'}</span><span class="b">Qtd: ${it.quantidade}</span></div>
  ${it.observacao ? `<div class="item-sub">Obs: ${it.observacao}</div>` : ''}
</div>
<div style="border-top:1px dotted #aaa;margin-bottom:3mm"></div>`).join('')}

<div class="total-line"><span>TOTAL ITENS</span><span>${items.length}</span></div>
<div style="display:flex;justify-content:space-between"><span>QTD TOTAL</span><span>${totalQty}</span></div>
<hr class="hr"/>

<div class="row"><span>Vendedor:</span><span class="v">${req.vendedorNome || req.solicitanteNome || '—'}</span></div>
${sep ? `<div class="row"><span>Separado por:</span><span class="v">${sep.separadoPorNome}</span></div>` : ''}
${req.observacoesGerais && req.observacoesGerais !== 'NÃO HÁ' ? `<hr class="hr"/><div class="b sm">Observações:</div><div class="sm">${req.observacoesGerais}</div>` : ''}
<hr class="hr"/>

<div class="c sm" style="margin-top:3mm">Conferido por:</div>
<div class="sig"></div>
<div class="c sm" style="margin-top:1mm">Assinatura / Carimbo</div>
<hr class="hr"/>
<div class="c sm">NOS · Sistema OPME · ${stamp}</div>
</body></html>`
}

/* ─── A4 formatted print ─────────────────────────────────────────────── */
function buildA4(req: Requisition, sep: SeparacaoRecord | null, isReprint: boolean): string {
  const items: OPMEItem[] = req.materiais ?? []
  const totalQty = items.reduce((s, i) => s + Number(i.quantidade), 0)
  const emerg = req.tipoCirurgia === 'emergencia'
  const now = new Date()
  const stamp = now.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const stampShort = now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const via = sep ? (isReprint ? sep.via : sep.via) : 1

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Separação ${req.numero}</title>
<style>
  ${BASE_STYLES}
  @page { size: A4; margin: 15mm 18mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; line-height: 1.4; }
  h1  { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.03em; }
  h2  { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #111; }
  .logo-block h1 { font-size: 22px; }
  .logo-block p  { font-size: 11px; color: #666; margin-top: 2px; }
  .meta-block    { text-align: right; font-size: 10px; color: #555; }
  .meta-block .req { font-size: 16px; font-weight: 700; color: #111; }
  .badge-emerg   { display: inline-block; background: #111; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-bottom: 8px; }
  .badge-reprint { display: inline-block; border: 2px solid #111; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 16px; }
  .info-row  { display: flex; gap: 6px; font-size: 11px; }
  .info-row .lbl { color: #666; min-width: 90px; flex-shrink: 0; }
  .info-row .val { font-weight: 600; }
  .table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .table th { background: #f4f4f4; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; border-bottom: 1px solid #ccc; }
  .table td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top; }
  .table tr:last-child td { border-bottom: none; }
  .table .num { text-align: center; }
  .table .qty { text-align: center; font-weight: 700; color: #007AFF; }
  .table .obs { font-size: 9px; color: #777; margin-top: 2px; }
  .totals { display: flex; justify-content: flex-end; gap: 20px; font-size: 11px; font-weight: 600; margin-bottom: 16px; padding: 8px 10px; background: #f8f8f8; border-radius: 6px; }
  .section { margin-bottom: 16px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
  .sig-box  { text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-bottom: 4px; }
  .sig-label { font-size: 9px; color: #666; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
  .sep-record { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 10px; }
  .sep-record strong { color: #166534; }
</style></head><body>

<!-- Header -->
<div class="header">
  <div class="logo-block">
    <h1>NOS · OPME</h1>
    <p>Separação de Materiais Cirúrgicos</p>
    ${emerg ? `<div class="badge-emerg">⚠ EMERGÊNCIA</div>` : ''}
    ${isReprint ? `<div class="badge-reprint">📋 ${via}ª VIA — CÓPIA DE SEPARAÇÃO JÁ REALIZADA</div>` : ''}
  </div>
  <div class="meta-block">
    <div class="req">${req.numero}</div>
    <div>${stampShort}</div>
  </div>
</div>

${sep && isReprint ? `
<div class="sep-record">
  ✅ <strong>Separação registrada</strong> em ${new Date(sep.separadoEm).toLocaleString('pt-BR')} por <strong>${sep.separadoPorNome}</strong>
  ${sep.observacao ? ` — Obs: ${sep.observacao}` : ''}
</div>` : ''}

<!-- Dados da cirurgia -->
<div class="section">
  <h2>Dados da Cirurgia</h2>
  <div class="info-grid">
    <div class="info-row"><span class="lbl">Data:</span><span class="val">${req.cirurgiaData ? formatDate(req.cirurgiaData) : '—'}</span></div>
    <div class="info-row"><span class="lbl">Horário:</span><span class="val">${req.cirurgiaHorario || '—'}</span></div>
    <div class="info-row"><span class="lbl">Hospital:</span><span class="val">${req.hospitalNome || '—'}</span></div>
    <div class="info-row"><span class="lbl">Sala:</span><span class="val">${req.cirurgiaSala || '—'}</span></div>
    <div class="info-row"><span class="lbl">Paciente:</span><span class="val">${req.pacienteNome || '—'}</span></div>
    <div class="info-row"><span class="lbl">Médico:</span><span class="val">${req.medicoNome || '—'}</span></div>
    <div class="info-row"><span class="lbl">Procedimento:</span><span class="val">${req.cirurgiaProcedimento || '—'}</span></div>
    <div class="info-row"><span class="lbl">Convênio:</span><span class="val">${req.cirurgiaConvenio || '—'}</span></div>
    <div class="info-row"><span class="lbl">Vendedor:</span><span class="val">${req.vendedorNome || req.solicitanteNome || '—'}</span></div>
    <div class="info-row"><span class="lbl">Tipo:</span><span class="val">${emerg ? 'Emergência' : 'Eletiva'}</span></div>
  </div>
</div>

<!-- Materiais -->
<div class="section">
  <h2>Lista de Materiais (${items.length} ${items.length === 1 ? 'item' : 'itens'})</h2>
  ${items.length === 0
    ? `<p style="color:#999;font-size:11px">Nenhum material cadastrado.</p>`
    : `<table class="table">
      <thead>
        <tr>
          <th style="width:28px" class="num">#</th>
          <th style="width:70px">Código</th>
          <th>Descrição / Fabricante</th>
          <th style="width:50px" class="num">Unid.</th>
          <th style="width:44px" class="num">Qtd</th>
          <th style="width:44px" class="num">✓</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
        <tr>
          <td class="num" style="color:#999">${idx + 1}</td>
          <td style="font-family:monospace;font-size:10px">${it.codigo || '—'}</td>
          <td>
            <div style="font-weight:600">${it.descricao}</div>
            ${it.fabricante ? `<div class="obs">Fab: ${it.fabricante}</div>` : ''}
            ${it.observacao ? `<div class="obs">Obs: ${it.observacao}</div>` : ''}
          </td>
          <td class="num" style="font-size:10px">${it.unidade || 'UN'}</td>
          <td class="qty">${it.quantidade}</td>
          <td class="num" style="font-size:16px">☐</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="totals">
      <span>${items.length} ${items.length === 1 ? 'item' : 'itens'}</span>
      <span>Qtd total: <strong>${totalQty}</strong></span>
    </div>`
  }
</div>

${req.observacoesGerais && req.observacoesGerais !== 'NÃO HÁ' ? `
<div class="section">
  <h2>Observações</h2>
  <p style="font-size:11px">${req.observacoesGerais}</p>
</div>` : ''}

<!-- Assinaturas -->
<div class="sig-grid">
  <div class="sig-box">
    <div style="height:24px"></div>
    <div class="sig-line"></div>
    <div class="sig-label">Separado por / Data</div>
  </div>
  <div class="sig-box">
    <div style="height:24px"></div>
    <div class="sig-line"></div>
    <div class="sig-label">Conferido por / Data</div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <span>NOS · Sistema OPME — Separação de Materiais</span>
  <span>${stamp}</span>
</div>
</body></html>`
}

/* ─── Print launcher ─────────────────────────────────────────────────── */
function doPrint(html: string, size: '80mm' | 'A4') {
  const w = size === '80mm' ? 340 : 850
  const h = size === '80mm' ? 700 : 1100
  const win = window.open('', '_blank', `width=${w},height=${h}`)
  if (!win) { alert('Permita pop-ups para imprimir.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 450)
}

/* ─── Status helpers ─────────────────────────────────────────────────── */
function statusColor(s: string) {
  const m: Record<string, string> = {
    enviada: '#007AFF', em_analise: '#FF9500', aprovada: '#34C759',
    em_separacao: '#AF52DE', separado: '#00C7BE', finalizada: '#00C7BE',
    cancelada: '#FF3B30', rascunho: '#8E8E93',
  }
  return m[s] ?? '#8E8E93'
}
function statusLabel(s: string) {
  const m: Record<string, string> = {
    enviada: 'Enviada', em_analise: 'Em Análise', aprovada: 'Aprovada',
    em_separacao: 'Em Separação', separado: 'Separado', finalizada: 'Finalizada',
    cancelada: 'Cancelada', rascunho: 'Rascunho',
  }
  return m[s] ?? s
}

/* ─── Historico modal ────────────────────────────────────────────────── */
function HistoricoModal({ reqNumero, records, onClose }: {
  reqNumero: string
  records: SeparacaoRecord[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1D1D1F' }}>Histórico de Separações</p>
            <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{reqNumero}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#48484A' }}>
            <X size={14} />
          </button>
        </div>
        <div className="divide-y p-2" style={{ maxHeight: 360, overflowY: 'auto', borderColor: 'rgba(0,0,0,0.04)' }}>
          {records.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: '#8E8E93' }}>Nenhum registro ainda</p>
          ) : records.map(r => (
            <div key={r.id} className="flex items-start gap-3 px-3 py-3 rounded-xl">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: r.via === 1 ? 'rgba(52,199,89,0.12)' : 'rgba(0,122,255,0.10)', color: r.via === 1 ? '#34C759' : '#007AFF' }}>
                {r.via}ª
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>{r.separadoPorNome}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
                  {new Date(r.separadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {r.observacao && <p className="text-xs mt-0.5 italic" style={{ color: '#48484A' }}>{r.observacao}</p>}
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: r.via === 1 ? 'rgba(52,199,89,0.12)' : 'rgba(0,122,255,0.10)', color: r.via === 1 ? '#34C759' : '#007AFF' }}>
                {r.via === 1 ? '1ª via' : `${r.via}ª via`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Confirm / obs modal ────────────────────────────────────────────── */
function ConfirmSepModal({ req, onConfirm, onClose }: {
  req: Requisition
  onConfirm: (obs: string) => void
  onClose: () => void
}) {
  const [obs, setObs] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="font-bold" style={{ color: '#1D1D1F' }}>Confirmar Separação</p>
          <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>{req.numero} · {req.pacienteNome}</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm" style={{ color: '#48484A' }}>
            Confirmar que os materiais desta requisição foram separados?
          </p>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#8E8E93' }}>
              Observação (opcional)
            </label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Ex: material retirado do armário B-3..."
              className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
              style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', color: '#1D1D1F' }}
            />
          </div>
        </div>
        <div className="px-5 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#48484A' }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(obs)} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#34C759', color: '#fff', boxShadow: '0 2px 8px rgba(52,199,89,0.35)' }}>
            ✓ Confirmar Separação
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Print modal ────────────────────────────────────────────────────── */
function PrintModal({ req, sep, isReprint, onClose }: {
  req: Requisition
  sep: SeparacaoRecord | null
  isReprint: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="font-bold text-sm" style={{ color: '#1D1D1F' }}>
            {isReprint ? `Imprimir ${sep ? sep.via + 'ª Via' : ''}` : 'Imprimir'}
          </p>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#48484A' }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs" style={{ color: '#8E8E93' }}>Escolha o formato de impressão:</p>
          <button
            onClick={() => { doPrint(buildCupom80(req, sep, isReprint), '80mm'); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-black/[0.03]"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,122,255,0.10)' }}>
              <Printer size={16} style={{ color: '#007AFF' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Cupom Térmico</p>
              <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>Impressora 80mm</p>
            </div>
          </button>
          <button
            onClick={() => { doPrint(buildA4(req, sep, isReprint), 'A4'); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-black/[0.03]"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(52,199,89,0.10)' }}>
              <FileText size={16} style={{ color: '#34C759' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Folha A4</p>
              <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>Impressora convencional</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Delete confirm modal ───────────────────────────────────────────── */
function DeleteConfirmModal({ req, onConfirm, onClose }: {
  req: Requisition
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden mx-4"
        style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.20)' }}>
        <div className="px-5 pt-5 pb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,59,48,0.10)' }}>
            <Trash2 size={20} style={{ color: '#FF3B30' }} />
          </div>
          <p className="font-bold text-base" style={{ color: '#1D1D1F' }}>Excluir Requisição</p>
          <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>
            <span className="font-semibold" style={{ color: '#48484A' }}>{req.numero}</span>
            {req.pacienteNome ? ` · ${req.pacienteNome}` : ''}
          </p>
          <p className="text-sm mt-3" style={{ color: '#48484A' }}>
            Esta ação é irreversível. A requisição e todo o histórico de separação serão removidos permanentemente.
          </p>
        </div>
        <div className="px-5 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#48484A' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ background: '#FF3B30', color: '#fff', boxShadow: '0 2px 8px rgba(255,59,48,0.35)' }}>
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Req card ───────────────────────────────────────────────────────── */
function ReqCard({ req, onDeleted }: { req: Requisition; onDeleted: (id: string) => void }) {
  const { user, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [sepRecord, setSepRecord] = useState<SeparacaoRecord | null>(null)
  const [historico, setHistorico] = useState<SeparacaoRecord[]>([])

  const reloadSep = useCallback(async () => {
    setSepRecord(await getSeparacaoByReq(req.id))
    setHistorico(await getHistoricoSeparacao(req.id))
  }, [req.id])

  useEffect(() => { reloadSep() }, [reloadSep])
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [isReprint, setIsReprint] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const items: OPMEItem[] = req.materiais ?? []
  const emerg = req.tipoCirurgia === 'emergencia'
  const jaFoiSeparado = !!sepRecord

  async function handleConfirmSep(obs: string) {
    const rec = await registrarSeparacao({
      reqId:           req.id,
      reqNumero:       req.numero,
      separadoPorId:   user!.id,
      separadoPorNome: user!.nome,
      observacao:      obs || undefined,
    })
    setSepRecord(rec)
    await reloadSep()
    setShowConfirm(false)
    setIsReprint(false)
    setShowPrint(true)
    const destinos: string[] = []
    if (req.vendedorEmail) destinos.push(req.vendedorEmail)
    if ((req as any).solicitanteEmail) destinos.push((req as any).solicitanteEmail)
    emailSeparacaoConfirmada(req, rec, destinos)
  }

  function openPrint(reprint: boolean) {
    setIsReprint(reprint)
    setShowPrint(true)
  }

  async function handleDelete() {
    await deleteRequisition(req.id, user!)
    setShowDelete(false)
    onDeleted(req.id)
  }

  return (
    <>
      {showConfirm && (
        <ConfirmSepModal req={req} onConfirm={handleConfirmSep} onClose={() => setShowConfirm(false)} />
      )}
      {showHistorico && (
        <HistoricoModal reqNumero={req.numero} records={historico} onClose={() => setShowHistorico(false)} />
      )}
      {showPrint && (
        <PrintModal req={req} sep={sepRecord} isReprint={isReprint} onClose={() => setShowPrint(false)} />
      )}
      {showDelete && (
        <DeleteConfirmModal req={req} onConfirm={handleDelete} onClose={() => setShowDelete(false)} />
      )}

      <div style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px)',
        border: jaFoiSeparado
          ? '1px solid rgba(52,199,89,0.30)'
          : emerg
            ? '1px solid rgba(255,59,48,0.25)'
            : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        {/* ── Card header ── */}
        <div className="flex items-start justify-between gap-3 p-4 cursor-pointer select-none"
          style={{ background: jaFoiSeparado ? 'rgba(52,199,89,0.04)' : emerg ? 'rgba(255,59,48,0.03)' : 'transparent' }}
          onClick={() => setOpen(o => !o)}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: jaFoiSeparado ? 'rgba(52,199,89,0.12)' : emerg ? 'rgba(255,59,48,0.12)' : 'rgba(0,122,255,0.10)' }}>
              {jaFoiSeparado
                ? <CheckCircle2 size={16} style={{ color: '#34C759' }} />
                : emerg
                  ? <AlertTriangle size={16} style={{ color: '#FF3B30' }} />
                  : <Package size={16} style={{ color: '#007AFF' }} />
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-semibold" style={{ color: '#8E8E93' }}>{req.numero}</span>
                {emerg && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#FF3B30', color: '#fff' }}>EMERG.</span>}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${statusColor(req.status)}18`, color: statusColor(req.status), border: `1px solid ${statusColor(req.status)}30` }}>
                  {statusLabel(req.status)}
                </span>
                {jaFoiSeparado && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(52,199,89,0.12)', color: '#34C759', border: '1px solid rgba(52,199,89,0.25)' }}>
                    ✓ Separado
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm truncate" style={{ color: '#1D1D1F' }}>
                {req.pacienteNome || 'Paciente não informado'}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {req.cirurgiaData && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8E8E93' }}>
                    <Calendar size={11} /> {formatDate(req.cirurgiaData)}{req.cirurgiaHorario ? ` · ${req.cirurgiaHorario}` : ''}
                  </span>
                )}
                {req.hospitalNome && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8E8E93' }}>
                    <Building2 size={11} /> {req.hospitalNome}
                  </span>
                )}
                {req.medicoNome && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8E8E93' }}>
                    <Stethoscope size={11} /> {req.medicoNome}
                  </span>
                )}
              </div>
              {jaFoiSeparado && sepRecord && (
                <p className="text-xs mt-1" style={{ color: '#34C759' }}>
                  Separado por {sepRecord.separadoPorNome} em{' '}
                  {new Date(sepRecord.separadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF' }}>
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>

            {/* Histórico */}
            {historico.length > 0 && (
              <button onClick={() => setShowHistorico(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-black/[0.05]"
                style={{ color: '#8E8E93' }} title="Histórico de separações">
                <History size={14} />
              </button>
            )}

            {/* Separar / Segunda via */}
            {!jaFoiSeparado ? (
              <button onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: '#34C759', color: '#fff', boxShadow: '0 2px 8px rgba(52,199,89,0.3)' }}>
                <CheckCircle2 size={13} /> Separar
              </button>
            ) : (
              <button onClick={() => openPrint(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF', border: '1px solid rgba(0,122,255,0.2)' }}>
                <Printer size={13} /> {sepRecord!.via}ª Via
              </button>
            )}

            {/* Imprimir */}
            <button onClick={() => openPrint(jaFoiSeparado)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: '#007AFF', color: '#fff', boxShadow: '0 2px 8px rgba(0,122,255,0.3)' }}>
              <Printer size={13} /> Imprimir
            </button>

            {/* Excluir — admin only */}
            {isAdmin && (
              <button onClick={() => setShowDelete(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-red-50"
                style={{ color: '#FF3B30' }} title="Excluir requisição">
                <Trash2 size={14} />
              </button>
            )}

            <div style={{ color: '#C7C7CC' }}>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* ── Materials expand ── */}
        {open && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <User size={12} style={{ color: '#8E8E93' }} />
              <span className="text-xs" style={{ color: '#8E8E93' }}>
                Vendedor: <strong style={{ color: '#48484A' }}>{req.vendedorNome || req.solicitanteNome || '—'}</strong>
              </span>
              {req.cirurgiaProcedimento && (
                <>
                  <span style={{ color: '#D1D1D6' }}>·</span>
                  <span className="text-xs" style={{ color: '#8E8E93' }}>
                    <strong style={{ color: '#48484A' }}>{req.cirurgiaProcedimento}</strong>
                  </span>
                </>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center">
                <Package size={28} className="mx-auto mb-2" style={{ color: '#D1D1D6' }} />
                <p className="text-sm" style={{ color: '#8E8E93' }}>Nenhum material cadastrado</p>
              </div>
            ) : (
              <div>
                <div className="grid px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ gridTemplateColumns: '2fr 3fr 2fr 60px 60px 36px', color: '#8E8E93', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <span>Código</span><span>Descrição</span><span>Fabricante</span>
                  <span className="text-center">Qtd</span><span>Unid.</span>
                  <span className="text-center">✓</span>
                </div>
                {items.map((it, idx) => (
                  <div key={it.id || idx}
                    className="grid items-center px-4 py-3 hover:bg-black/[0.02]"
                    style={{ gridTemplateColumns: '2fr 3fr 2fr 60px 60px 36px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="text-xs font-mono" style={{ color: '#8E8E93' }}>{it.codigo || '—'}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1D1D1F' }}>{it.descricao}</p>
                      {it.observacao && <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>Obs: {it.observacao}</p>}
                    </div>
                    <span className="text-xs" style={{ color: '#48484A' }}>{it.fabricante || '—'}</span>
                    <span className="text-sm font-bold text-center" style={{ color: '#007AFF' }}>{it.quantidade}</span>
                    <span className="text-xs font-mono text-center" style={{ color: '#8E8E93' }}>{it.unidade || 'UN'}</span>
                    <span className="text-center text-lg" style={{ color: jaFoiSeparado ? '#34C759' : '#D1D1D6' }}>
                      {jaFoiSeparado ? '✓' : '☐'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-end gap-6 px-4 py-2.5 text-xs font-semibold"
                  style={{ background: 'rgba(0,0,0,0.02)', color: '#48484A' }}>
                  <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                  <span>Qtd total: <span style={{ color: '#007AFF' }}>{items.reduce((s, i) => s + Number(i.quantidade), 0)}</span></span>
                </div>
              </div>
            )}

            {req.observacoesGerais && req.observacoesGerais !== 'NÃO HÁ' && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(255,149,0,0.04)' }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#FF9500' }}>Observações gerais</p>
                <p className="text-sm" style={{ color: '#48484A' }}>{req.observacoesGerais}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function MaterialSeparation() {
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pendente' | 'separado'>('all')
  const [allReqs, setAllReqs] = useState<Requisition[]>([])
  const [sepMap, setSepMap] = useState<Map<string, SeparacaoRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    const [reqs, seps] = await Promise.all([getRequisitions(), getSeparacoes()])
    const m = new Map<string, SeparacaoRecord>()
    for (const s of seps) m.set(s.reqId, s)
    setAllReqs(reqs.filter(r => r.status !== 'rascunho'))
    setSepMap(m)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleDeleted(id: string) {
    setDeletedIds(prev => new Set([...prev, id]))
  }

  const all = allReqs.filter(r => !deletedIds.has(r.id))

  const filtered = all.filter(r => {
    const q = search.toLowerCase()
    const sep = sepMap.get(r.id)
    const matchSearch = !q ||
      r.pacienteNome?.toLowerCase().includes(q) ||
      r.numero?.toLowerCase().includes(q) ||
      r.hospitalNome?.toLowerCase().includes(q) ||
      r.medicoNome?.toLowerCase().includes(q) ||
      r.materiais?.some(m => m.descricao.toLowerCase().includes(q) || m.codigo?.toLowerCase().includes(q))
    const matchDate = !filterDate || r.cirurgiaData === filterDate
    const matchStatus = filterStatus === 'all' || (filterStatus === 'separado' ? !!sep : !sep)
    return matchSearch && matchDate && matchStatus
  }).sort((a, b) => {
    const sa = sepMap.get(a.id), sb = sepMap.get(b.id)
    if (!sa && sb) return -1
    if (sa && !sb) return 1
    return (a.cirurgiaData || '').localeCompare(b.cirurgiaData || '') || (a.cirurgiaHorario || '').localeCompare(b.cirurgiaHorario || '')
  })

  const totalItems = filtered.reduce((s, r) => s + (r.materiais?.length ?? 0), 0)
  const separados = all.filter(r => sepMap.has(r.id)).length
  const pendentes = all.length - separados

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: '#1D1D1F' }}>Separação de Materiais</h2>
        <p className="text-sm mt-0.5" style={{ color: '#8E8E93' }}>
          {filtered.length} requisição{filtered.length !== 1 ? 'ões' : ''} · {totalItems} {totalItems === 1 ? 'material' : 'materiais'}
        </p>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: all.length, color: '#007AFF', bg: 'rgba(0,122,255,0.08)' },
          { label: 'Pendentes', value: pendentes, color: '#FF9500', bg: 'rgba(255,149,0,0.08)' },
          { label: 'Separados', value: separados, color: '#34C759', bg: 'rgba(52,199,89,0.08)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 text-center"
            style={{ background: k.bg, border: `1px solid ${k.color}18` }}>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: k.color }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.07)', backdropFilter: 'blur(16px)' }}>
          <Search size={15} style={{ color: '#8E8E93', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente, material, hospital..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#1D1D1F' }} />
        </div>

        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.07)', backdropFilter: 'blur(16px)', color: filterDate ? '#1D1D1F' : '#8E8E93' }} />

        {/* Status filter tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.88)' }}>
          {([
            { v: 'all', l: 'Todas' },
            { v: 'pendente', l: '⏳ Pendentes' },
            { v: 'separado', l: '✓ Separados' },
          ] as const).map(({ v, l }) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className="px-3 py-2 text-xs font-medium transition-all"
              style={filterStatus === v
                ? { background: '#007AFF', color: '#fff' }
                : { color: '#8E8E93' }}>
              {l}
            </button>
          ))}
        </div>

        {(search || filterDate) && (
          <button onClick={() => { setSearch(''); setFilterDate('') }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.15)' }}>
            Limpar
          </button>
        )}
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <Package size={36} className="mx-auto mb-3" style={{ color: '#D1D1D6' }} />
          <p className="font-semibold" style={{ color: '#48484A' }}>Nenhuma requisição encontrada</p>
          <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>
            {search || filterDate ? 'Tente ajustar os filtros' : 'As requisições aparecerão aqui'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => <ReqCard key={req.id} req={req} onDeleted={handleDeleted} />)}
        </div>
      )}
    </div>
  )
}
