import type { Requisition } from '../types'
import { formatDate } from './helpers'
import { loadSettings } from './settings-storage'
import { getSignedUrls } from './cadastros-storage'

export function formatRequisitionMessage(req: Requisition, signedUrls?: Record<string, string>): string {
  const tipo = req.tipoCirurgia === 'emergencia' ? '[EMERGENCIA]' : 'Eletiva'
  const dataHora = req.cirurgiaData
    ? `${formatDate(req.cirurgiaData)}${req.cirurgiaHorario ? ' as ' + req.cirurgiaHorario : ''}`
    : '-'

  const materiais = req.materiais.length > 0
    ? req.materiais.map(m => `  - ${m.quantidade}x ${m.descricao}${m.fabricante ? ` (${m.fabricante})` : ''}${m.observacao ? ` | ${m.observacao}` : ''}`).join('\n')
    : '  Nenhum material informado'

  const obs = req.observacoesGerais?.trim()
  const anexos = req.anexos?.length > 0
    ? req.anexos.map(a => {
        const url = signedUrls?.[a.id] || a.url
        return `  📎 ${a.nome}\n     ${url}`
      }).join('\n')
    : null

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
    anexos ? `\n*ANEXOS (${req.anexos.length})*\n${anexos}` : null,
    ``,
    `_Solicitante: ${req.solicitanteNome}_`,
    `_Vendedor: ${req.vendedorNome || '-'}${req.vendedorTelefone ? ' - ' + req.vendedorTelefone : ''}_`,
  ].filter(l => l !== null).join('\n')
}

export async function shareWhatsApp(req: Requisition): Promise<void> {
  const settings = loadSettings()
  if (!settings.whatsapp.enabled) return

  let signedUrls: Record<string, string> | undefined
  if (req.anexos?.length) {
    try { signedUrls = await getSignedUrls(req.anexos) } catch {}
  }

  const text = formatRequisitionMessage(req, signedUrls)
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
    const phone = settings.whatsapp.defaultPhone.replace(/\D/g, '')
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      // Mobile: wa.me abre o app diretamente
      const url = phone
        ? `https://wa.me/${phone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`
      window.open(url, '_blank')
    } else {
      // Desktop: whatsapp:// abre o app instalado sem página intermediária
      const url = phone
        ? `whatsapp://send?phone=${phone}&text=${encoded}`
        : `whatsapp://send?text=${encoded}`
      window.location.href = url
    }
  }
}

export async function shareEmail(req: Requisition): Promise<void> {
  const settings = loadSettings()
  if (!settings.email.enabled) return

  let signedUrls: Record<string, string> | undefined
  if (req.anexos?.length) {
    try { signedUrls = await getSignedUrls(req.anexos) } catch {}
  }

  const subject = encodeURIComponent(`[OPME NOS] Requisição ${req.numero} — ${req.pacienteNome} — ${req.hospitalNome}`)
  const body = encodeURIComponent(formatRequisitionMessage(req, signedUrls).replace(/\*/g, ''))
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
        text: formatRequisitionMessage(req, signedUrls).replace(/\*/g, ''),
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
export async function shareAll(req: Requisition): Promise<void> {
  const settings = loadSettings()
  if (settings.whatsapp.enabled) await shareWhatsApp(req)
  if (settings.email.enabled) {
    if (settings.email.mode === 'mailto') {
      setTimeout(() => shareEmail(req), 800)
    } else {
      await shareEmail(req)
    }
  }
}
