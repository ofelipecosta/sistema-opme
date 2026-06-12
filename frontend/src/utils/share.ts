import type { Requisition } from '../types'
import { formatDate } from './helpers'
import { loadSettings } from './settings-storage'

export function formatRequisitionMessage(req: Requisition): string {
  const tipo = req.tipoCirurgia === 'emergencia' ? '[EMERGENCIA]' : 'Eletiva'
  const dataHora = req.cirurgiaData
    ? `${formatDate(req.cirurgiaData)}${req.cirurgiaHorario ? ' as ' + req.cirurgiaHorario : ''}`
    : '-'

  const materiais = req.materiais.length > 0
    ? req.materiais.map(m => `  - ${m.quantidade}x ${m.descricao}${m.fabricante ? ` (${m.fabricante})` : ''}${m.observacao ? ` | ${m.observacao}` : ''}`).join('\n')
    : '  Nenhum material informado'

  const obs = req.observacoesGerais?.trim()

  return [
    `*REQUISICAO OPME - NOS*`,
    `*No:* ${req.numero} | ${tipo}`,
    ``,
    `*AGENDA: ${dataHora}*`,
    req.cirurgiaSala ? `Sala: ${req.cirurgiaSala}` : null,
    ``,
    `*HOSPITAL*`,
    `${req.hospitalNome}${req.hospitalCidade ? ` - ${req.hospitalCidade}/${req.hospitalEstado}` : ''}`,
    req.hospitalSetor ? `Setor: ${req.hospitalSetor}` : null,
    req.hospitalContato ? `Contato: ${req.hospitalContato}` : null,
    ``,
    `*MEDICO*`,
    `${req.medicoNome}${req.medicoEspecialidade ? ` - ${req.medicoEspecialidade}` : ''}`,
    req.medicoCRM ? req.medicoCRM : null,
    ``,
    `*PACIENTE*`,
    `${req.pacienteNome}`,
    req.pacienteProntuario ? `Prontuario: ${req.pacienteProntuario}` : null,
    ``,
    `*PROCEDIMENTO*`,
    req.cirurgiaProcedimento || '-',
    req.cirurgiaConvenio ? `Convenio: ${req.cirurgiaConvenio}` : null,
    req.cirurgiaCodTUSS ? `TUSS: ${req.cirurgiaCodTUSS}` : null,
    ``,
    `*MATERIAIS (${req.materiais.length} ${req.materiais.length === 1 ? 'item' : 'itens'})*`,
    materiais,
    obs ? `\n*OBSERVACOES*\n${obs}` : null,
    ``,
    `_Solicitante: ${req.solicitanteNome}_`,
    `_Vendedor: ${req.vendedorNome || '-'}${req.vendedorTelefone ? ' - ' + req.vendedorTelefone : ''}_`,
  ].filter(l => l !== null).join('\n')
}

export function shareWhatsApp(req: Requisition): void {
  const settings = loadSettings()
  if (!settings.whatsapp.enabled) return

  const text = formatRequisitionMessage(req)
  const encoded = encodeURIComponent(text)

  if (settings.whatsapp.mode === 'api' && settings.whatsapp.apiUrl) {
    // WhatsApp Business API via backend proxy
    const phone = settings.whatsapp.defaultPhone.replace(/\D/g, '')
    fetch(settings.whatsapp.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.whatsapp.apiToken ? { Authorization: `Bearer ${settings.whatsapp.apiToken}` } : {}),
      },
      body: JSON.stringify({ phone, message: formatRequisitionMessage(req) }),
    }).catch(console.error)
  } else {
    // wa.me link (padrão — abre no browser/app)
    const phone = settings.whatsapp.defaultPhone.replace(/\D/g, '')
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }
}

export function shareEmail(req: Requisition): void {
  const settings = loadSettings()
  if (!settings.email.enabled) return

  const subject = encodeURIComponent(`[OPME NOS] Requisição ${req.numero} — ${req.pacienteNome} — ${req.hospitalNome}`)
  const body = encodeURIComponent(formatRequisitionMessage(req).replace(/\*/g, ''))
  const to = settings.email.defaultTo || ''

  if (settings.email.mode === 'smtp' && settings.email.smtpApiUrl) {
    // Envia via backend proxy SMTP
    fetch(settings.email.smtpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.whatsapp.apiToken ? { Authorization: `Bearer ${settings.whatsapp.apiToken}` } : {}),
      },
      body: JSON.stringify({
        to: settings.email.defaultTo,
        subject: `[OPME NOS] Requisição ${req.numero} — ${req.pacienteNome}`,
        text: formatRequisitionMessage(req).replace(/\*/g, ''),
        from: settings.email.smtpFrom,
        fromName: settings.email.smtpFromName,
      }),
    }).catch(console.error)
  } else {
    // mailto: abre cliente de e-mail local
    window.open(`mailto:${to}?subject=${subject}&body=${body}`)
  }
}

/** Dispara WhatsApp + Email conforme configurações */
export function shareAll(req: Requisition): void {
  const settings = loadSettings()
  if (settings.whatsapp.enabled) shareWhatsApp(req)
  if (settings.email.enabled) {
    if (settings.email.mode === 'mailto') {
      // Pequeno delay para não abrir dois pop-ups simultâneos
      setTimeout(() => shareEmail(req), 800)
    } else {
      shareEmail(req)
    }
  }
}
