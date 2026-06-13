import { useState, useEffect, useCallback } from 'react'
import {
  Search, Printer, Package, ChevronDown, ChevronUp,
  Calendar, User, Building2, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, FileText, History, X, Trash2, Filter,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

function useT() {
  const { isDark } = useTheme()
  return {
    isDark,
    card:       isDark ? '#1F2937' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    text1:      isDark ? '#F3F4F6' : '#1D1D1F',
    text2:      isDark ? '#D1D5DB' : '#48484A',
    text3:      isDark ? '#9CA3AF' : '#8E8E93',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    hover:      isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
    inputBg:    isDark ? '#374151' : 'rgba(0,0,0,0.04)',
    shadow:     isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.06)',
  }
}
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
  reqNumero: string; records: SeparacaoRecord[]; onClose: () => void
}) {
  const T = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <div>
            <p className="font-bold text-sm" style={{ color: T.text1 }}>Histórico de Separações</p>
            <p className="text-xs mt-0.5" style={{ color: T.text3 }}>{reqNumero}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: T.inputBg, color: T.text2 }}>
            <X size={14} />
          </button>
        </div>
        <div className="divide-y p-2" style={{ maxHeight: 360, overflowY: 'auto', borderColor: T.divider }}>
          {records.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: T.text3 }}>Nenhum registro ainda</p>
          ) : records.map(r => (
            <div key={r.id} className="flex items-start gap-3 px-3 py-3 rounded-xl">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: r.via === 1 ? 'rgba(52,199,89,0.15)' : 'rgba(0,122,255,0.12)', color: r.via === 1 ? '#34C759' : '#007AFF' }}>
                {r.via}ª
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: T.text1 }}>{r.separadoPorNome}</p>
                <p className="text-xs mt-0.5" style={{ color: T.text3 }}>
                  {new Date(r.separadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {r.observacao && <p className="text-xs mt-0.5 italic" style={{ color: T.text2 }}>{r.observacao}</p>}
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: r.via === 1 ? 'rgba(52,199,89,0.15)' : 'rgba(0,122,255,0.12)', color: r.via === 1 ? '#34C759' : '#007AFF' }}>
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
  req: Requisition; onConfirm: (obs: string) => void; onClose: () => void
}) {
  const T = useT()
  const [obs, setObs] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <p className="font-bold" style={{ color: T.text1 }}>Confirmar Separação</p>
          <p className="text-xs mt-1" style={{ color: T.text3 }}>{req.numero} · {req.pacienteNome}</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm" style={{ color: T.text2 }}>
            Confirmar que os materiais desta requisição foram separados?
          </p>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text3 }}>
              Observação (opcional)
            </label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Ex: material retirado do armário B-3..."
              className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
              style={{ background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1 }}
            />
          </div>
        </div>
        <div className="px-5 py-4 flex gap-3 justify-end" style={{ borderTop: `1px solid ${T.divider}` }}>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancelar</button>
          <button onClick={() => onConfirm(obs)} className="btn-success btn-sm">✓ Confirmar Separação</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Print modal ────────────────────────────────────────────────────── */
function PrintModal({ req, sep, isReprint, onClose }: {
  req: Requisition; sep: SeparacaoRecord | null; isReprint: boolean; onClose: () => void
}) {
  const T = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-xs mx-4 rounded-2xl overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <p className="font-bold text-sm" style={{ color: T.text1 }}>
            {isReprint ? `Imprimir ${sep ? sep.via + 'ª Via' : ''}` : 'Imprimir'}
          </p>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: T.inputBg, color: T.text2 }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs" style={{ color: T.text3 }}>Escolha o formato de impressão:</p>
          <button
            onClick={() => { doPrint(buildCupom80(req, sep, isReprint), '80mm'); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
            style={{ border: `1px solid ${T.cardBorder}`, background: T.hover }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,122,255,0.12)' }}>
              <Printer size={16} style={{ color: '#007AFF' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: T.text1 }}>Cupom Térmico</p>
              <p className="text-xs mt-0.5" style={{ color: T.text3 }}>Impressora 80mm</p>
            </div>
          </button>
          <button
            onClick={() => { doPrint(buildA4(req, sep, isReprint), 'A4'); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
            style={{ border: `1px solid ${T.cardBorder}`, background: T.hover }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(52,199,89,0.12)' }}>
              <FileText size={16} style={{ color: '#34C759' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: T.text1 }}>Folha A4</p>
              <p className="text-xs mt-0.5" style={{ color: T.text3 }}>Impressora convencional</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Delete confirm modal ───────────────────────────────────────────── */
function DeleteConfirmModal({ req, onConfirm, onClose }: {
  req: Requisition; onConfirm: () => void; onClose: () => void
}) {
  const T = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden mx-4"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
        <div className="px-5 pt-5 pb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,59,48,0.12)' }}>
            <Trash2 size={20} style={{ color: '#FF3B30' }} />
          </div>
          <p className="font-bold text-base" style={{ color: T.text1 }}>Excluir Requisição</p>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
            <span className="font-semibold" style={{ color: T.text2 }}>{req.numero}</span>
            {req.pacienteNome ? ` · ${req.pacienteNome}` : ''}
          </p>
          <p className="text-sm mt-3" style={{ color: T.text2 }}>
            Esta ação é irreversível. A requisição e todo o histórico de separação serão removidos permanentemente.
          </p>
        </div>
        <div className="px-5 py-4 flex gap-3 justify-end" style={{ borderTop: `1px solid ${T.divider}` }}>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancelar</button>
          <button onClick={onConfirm} className="btn-danger btn-sm flex items-center gap-1.5"><Trash2 size={13} /> Excluir</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Req card ───────────────────────────────────────────────────────── */
function ReqCard({ req, onDeleted }: { req: Requisition; onDeleted: (id: string) => void }) {
  const { user, isAdmin } = useAuth()
  const T = useT()
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

  const accentColor = jaFoiSeparado ? '#34C759' : emerg ? '#FF3B30' : '#007AFF'

  return (
    <>
      {showConfirm   && <ConfirmSepModal req={req} onConfirm={handleConfirmSep} onClose={() => setShowConfirm(false)} />}
      {showHistorico && <HistoricoModal reqNumero={req.numero} records={historico} onClose={() => setShowHistorico(false)} />}
      {showPrint     && <PrintModal req={req} sep={sepRecord} isReprint={isReprint} onClose={() => setShowPrint(false)} />}
      {showDelete    && <DeleteConfirmModal req={req} onConfirm={handleDelete} onClose={() => setShowDelete(false)} />}

      <div style={{
        background: T.card,
        border: `1px solid ${T.cardBorder}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: T.shadow,
      }}>

        {/* ── Top info row ── */}
        <div className="px-4 pt-4 pb-3">
          {/* Row 1: REQ number + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-mono font-semibold" style={{ color: T.text3 }}>{req.numero}</span>
            {emerg && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FF3B30', color: '#fff' }}>
                ⚡ EMERGÊNCIA
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${statusColor(req.status)}20`, color: statusColor(req.status), border: `1px solid ${statusColor(req.status)}40` }}>
              {statusLabel(req.status)}
            </span>
            {jaFoiSeparado && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,199,89,0.15)', color: '#34C759', border: '1px solid rgba(52,199,89,0.3)' }}>
                ✓ Separado
              </span>
            )}
          </div>

          {/* Row 2: Patient name */}
          <p className="font-bold text-base leading-tight" style={{ color: T.text1 }}>
            {req.pacienteNome || 'Paciente não informado'}
          </p>

          {/* Row 3: Surgery info chips */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {req.cirurgiaData && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: T.text2 }}>
                <Calendar size={12} style={{ color: T.text3, flexShrink: 0 }} />
                {formatDate(req.cirurgiaData)}{req.cirurgiaHorario ? ` às ${req.cirurgiaHorario}` : ''}
              </span>
            )}
            {req.hospitalNome && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: T.text2 }}>
                <Building2 size={12} style={{ color: T.text3, flexShrink: 0 }} />
                {req.hospitalNome}
              </span>
            )}
            {req.medicoNome && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: T.text2 }}>
                <Stethoscope size={12} style={{ color: T.text3, flexShrink: 0 }} />
                {req.medicoNome}
              </span>
            )}
          </div>

          {/* Separação info */}
          {jaFoiSeparado && sepRecord && (
            <div className="mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 w-fit"
              style={{ background: 'rgba(52,199,89,0.10)', color: T.isDark ? '#86efac' : '#166534' }}>
              <CheckCircle2 size={12} />
              Separado por <strong>{sepRecord.separadoPorNome}</strong> em{' '}
              {new Date(sepRecord.separadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: T.divider, margin: '0 16px' }} />

        {/* ── Action bar ── */}
        <div className="flex items-center gap-2 px-4 py-3 flex-wrap" onClick={e => e.stopPropagation()}>

          {/* Qtd badge + expand toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF', border: '1px solid rgba(0,122,255,0.18)' }}>
            <Package size={12} />
            {items.length} {items.length === 1 ? 'item' : 'itens'}
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          <div style={{ flex: 1 }} />

          {/* Histórico */}
          {historico.length > 0 && (
            <button onClick={() => setShowHistorico(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: T.inputBg, color: T.text3 }}>
              <History size={13} /> Histórico
            </button>
          )}

          {/* Separar / Separado */}
          {!jaFoiSeparado ? (
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: '#34C759', color: '#fff', boxShadow: '0 2px 8px rgba(52,199,89,0.35)' }}>
              <CheckCircle2 size={14} /> Separar
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(52,199,89,0.12)', color: T.isDark ? '#86efac' : '#166534', border: '1px solid rgba(52,199,89,0.25)' }}>
              <CheckCircle2 size={14} /> Separado
            </span>
          )}

          {/* Imprimir */}
          <button onClick={() => openPrint(jaFoiSeparado)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#007AFF', color: '#fff', boxShadow: '0 2px 8px rgba(0,122,255,0.3)' }}>
            <Printer size={13} /> Imprimir
          </button>

          {/* Excluir — admin only */}
          {isAdmin && (
            <button onClick={() => setShowDelete(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }} title="Excluir">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* ── Materials list (expandable) ── */}
        {open && (
          <div style={{ borderTop: `1px solid ${T.divider}` }}>
            {/* Vendedor + procedimento */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5"
              style={{ background: T.hover, borderBottom: `1px solid ${T.divider}` }}>
              {(req.vendedorNome || req.solicitanteNome) && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
                  <User size={11} /> Vendedor: <strong style={{ color: T.text2 }}>{req.vendedorNome || req.solicitanteNome}</strong>
                </span>
              )}
              {req.cirurgiaProcedimento && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
                  <FileText size={11} /> <strong style={{ color: T.text2 }}>{req.cirurgiaProcedimento}</strong>
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center">
                <Package size={28} className="mx-auto mb-2" style={{ color: T.text3 }} />
                <p className="text-sm" style={{ color: T.text3 }}>Nenhum material cadastrado</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: T.divider }}>
                {items.map((it, idx) => (
                  <div key={it.id || idx} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl flex-shrink-0 w-6 text-center leading-none"
                      style={{ color: jaFoiSeparado ? '#34C759' : T.text3 }}>
                      {jaFoiSeparado ? '✓' : '☐'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: T.text1 }}>{it.descricao}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {it.codigo && <span className="text-xs font-mono" style={{ color: T.text3 }}>{it.codigo}</span>}
                        {it.fabricante && <span className="text-xs" style={{ color: T.text3 }}>{it.fabricante}</span>}
                        {it.observacao && <span className="text-xs italic" style={{ color: '#FF9500' }}>{it.observacao}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-lg font-bold" style={{ color: '#007AFF' }}>{it.quantidade}</span>
                      <span className="text-xs font-mono block leading-none" style={{ color: T.text3 }}>{it.unidade || 'UN'}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-6 px-4 py-2.5 text-xs font-semibold"
                  style={{ background: T.hover, color: T.text2 }}>
                  <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                  <span>Qtd total: <span style={{ color: '#007AFF' }}>{items.reduce((s, i) => s + Number(i.quantidade), 0)}</span></span>
                </div>
              </div>
            )}

            {req.observacoesGerais && req.observacoesGerais !== 'NÃO HÁ' && (
              <div className="px-4 py-3 flex gap-2" style={{ borderTop: `1px solid ${T.divider}`, background: 'rgba(255,149,0,0.05)' }}>
                <Clock size={14} style={{ color: '#FF9500', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#FF9500' }}>Observações</p>
                  <p className="text-sm mt-0.5" style={{ color: T.text2 }}>{req.observacoesGerais}</p>
                </div>
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
  const T = useT()
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

  const separados = all.filter(r => sepMap.has(r.id)).length
  const pendentes = all.length - separados

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── KPIs + filtros em linha ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* KPI pills */}
        {[
          { label: 'Total',     value: all.length, color: '#007AFF', icon: Package },
          { label: 'Pendentes', value: pendentes,   color: '#FF9500', icon: Clock   },
          { label: 'Separados', value: separados,   color: '#34C759', icon: CheckCircle2 },
        ].map(k => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${k.color}18` }}>
              <k.icon size={15} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-0.5" style={{ color: T.text3 }}>{k.label}</p>
            </div>
          </div>
        ))}

        {/* Separador visual */}
        <div className="h-8 w-px mx-1 hidden sm:block" style={{ background: T.cardBorder }} />

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-56 rounded-xl px-3 py-2.5"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <Search size={15} style={{ color: T.text3, flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente, material, hospital..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: T.text1 }} />
          {search && <button onClick={() => setSearch('')} style={{ color: T.text3 }}><X size={13} /></button>}
        </div>

        {/* Date filter */}
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}`, color: filterDate ? T.text1 : T.text3 }} />

        {/* Status tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${T.cardBorder}`, background: T.card }}>
          {([
            { v: 'all',      l: 'Todas' },
            { v: 'pendente', l: 'Pendentes' },
            { v: 'separado', l: '✓ Separados' },
          ] as const).map(({ v, l }) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className="px-3 py-2.5 text-xs font-medium transition-all"
              style={filterStatus === v ? { background: '#007AFF', color: '#fff' } : { color: T.text3 }}>
              {l}
            </button>
          ))}
        </div>

        {filterDate && (
          <button onClick={() => setFilterDate('')}
            className="px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.15)' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {(search || filterDate || filterStatus !== 'all') && (
        <p className="text-xs" style={{ color: T.text3 }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <Package size={36} className="mx-auto mb-3" style={{ color: T.text3 }} />
          <p className="font-semibold" style={{ color: T.text2 }}>Nenhuma requisição encontrada</p>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
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
