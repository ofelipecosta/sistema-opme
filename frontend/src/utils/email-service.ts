import emailjs from '@emailjs/browser'
import { EMAIL_CONFIG, EMAIL_ADMINS } from './email-config'
import type { Requisition } from '../types'
import type { SeparacaoRecord } from '../types'

let initialized = false

function init() {
  if (initialized) return
  if (!EMAIL_CONFIG.PUBLIC_KEY || EMAIL_CONFIG.PUBLIC_KEY === 'SUA_PUBLIC_KEY_AQUI') return
  emailjs.init({ publicKey: EMAIL_CONFIG.PUBLIC_KEY })
  initialized = true
}

function isConfigured(): boolean {
  return (
    EMAIL_CONFIG.PUBLIC_KEY !== 'SUA_PUBLIC_KEY_AQUI' &&
    EMAIL_CONFIG.SERVICE_ID !== 'SEU_SERVICE_ID_AQUI' &&
    !!EMAIL_CONFIG.PUBLIC_KEY &&
    !!EMAIL_CONFIG.SERVICE_ID
  )
}

async function send(templateId: string, params: Record<string, string>) {
  if (!isConfigured()) {
    console.info('[EmailJS] Não configurado — e-mail não enviado:', params)
    return
  }
  init()
  try {
    await emailjs.send(EMAIL_CONFIG.SERVICE_ID, templateId, params)
  } catch (err) {
    console.error('[EmailJS] Erro ao enviar e-mail:', err)
  }
}

/* ────────────────────────────────────────────────────────────────────
   Template: NOVA_REQUISICAO
   Campos disponíveis no template EmailJS:
     {{to_email}}         — e-mail do destinatário
     {{to_name}}          — nome do destinatário
     {{req_numero}}       — ex: REQ-2026-00001
     {{req_paciente}}     — nome do paciente
     {{req_hospital}}     — hospital
     {{req_data}}         — data da cirurgia
     {{req_horario}}      — horário
     {{req_procedimento}} — procedimento
     {{req_tipo}}         — Eletiva / Emergência
     {{req_materiais}}    — lista de materiais (texto)
     {{solicitante}}      — nome de quem criou
     {{link_sistema}}     — URL do sistema
──────────────────────────────────────────────────────────────────── */
export async function emailNovaRequisicao(req: Requisition, destinatarios: string[]) {
  const todos = [...new Set([...destinatarios, ...EMAIL_ADMINS])].filter(Boolean)
  if (!todos.length) return

  const materiais = (req.materiais ?? [])
    .map((m, i) => `${i + 1}. ${m.descricao}${m.codigo ? ` [${m.codigo}]` : ''} — Qtd: ${m.quantidade}`)
    .join('\n') || 'Nenhum material'

  const params = {
    req_numero:       req.numero ?? '',
    req_paciente:     req.pacienteNome ?? 'Não informado',
    req_hospital:     req.hospitalNome ?? 'Não informado',
    req_data:         req.cirurgiaData ? new Date(req.cirurgiaData + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    req_horario:      req.cirurgiaHorario ?? '—',
    req_procedimento: req.cirurgiaProcedimento ?? '—',
    req_tipo:         req.tipoCirurgia === 'emergencia' ? '⚠ EMERGÊNCIA' : 'Eletiva',
    req_materiais:    materiais,
    solicitante:      req.solicitanteNome ?? '—',
    link_sistema:     window.location.origin,
  }

  for (const email of todos) {
    await send(EMAIL_CONFIG.TEMPLATES.NOVA_REQUISICAO, { ...params, to_email: email, to_name: email })
  }
}

/* ────────────────────────────────────────────────────────────────────
   Template: STATUS_ATUALIZADO
   Campos disponíveis no template EmailJS:
     {{to_email}}      — e-mail do destinatário
     {{to_name}}       — nome do destinatário
     {{req_numero}}    — número da requisição
     {{req_paciente}}  — nome do paciente
     {{status_novo}}   — novo status (label)
     {{status_obs}}    — observação / motivo (se houver)
     {{atualizado_por}}— nome de quem atualizou
     {{link_sistema}}  — URL do sistema
──────────────────────────────────────────────────────────────────── */
export async function emailStatusAtualizado(
  req: Requisition,
  novoStatusLabel: string,
  atualizadoPorNome: string,
  observacao: string,
  destinatarios: string[],
) {
  const todos = [...new Set([...destinatarios, ...EMAIL_ADMINS])].filter(Boolean)
  if (!todos.length) return

  const params = {
    req_numero:    req.numero ?? '',
    req_paciente:  req.pacienteNome ?? 'Não informado',
    status_novo:   novoStatusLabel,
    status_obs:    observacao || '—',
    atualizado_por: atualizadoPorNome,
    link_sistema:  window.location.origin,
  }

  for (const email of todos) {
    await send(EMAIL_CONFIG.TEMPLATES.STATUS_ATUALIZADO, { ...params, to_email: email, to_name: email })
  }
}

/* ────────────────────────────────────────────────────────────────────
   Template: SEPARACAO_CONFIRMADA
   Campos disponíveis no template EmailJS:
     {{to_email}}       — e-mail do destinatário
     {{to_name}}        — nome do destinatário
     {{req_numero}}     — número da requisição
     {{req_paciente}}   — nome do paciente
     {{req_hospital}}   — hospital
     {{req_data}}       — data da cirurgia
     {{req_materiais}}  — lista de materiais
     {{separado_por}}   — nome do estoquista
     {{separado_em}}    — data/hora da separação
     {{via}}            — número da via
     {{link_sistema}}   — URL do sistema
──────────────────────────────────────────────────────────────────── */
export async function emailSeparacaoConfirmada(
  req: Requisition,
  sep: SeparacaoRecord,
  destinatarios: string[],
) {
  const todos = [...new Set([...destinatarios, ...EMAIL_ADMINS])].filter(Boolean)
  if (!todos.length) return

  const materiais = (req.materiais ?? [])
    .map((m, i) => `${i + 1}. ${m.descricao} — Qtd: ${m.quantidade}`)
    .join('\n') || 'Nenhum material'

  const params = {
    req_numero:   req.numero ?? '',
    req_paciente: req.pacienteNome ?? 'Não informado',
    req_hospital: req.hospitalNome ?? '—',
    req_data:     req.cirurgiaData ? new Date(req.cirurgiaData + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    req_materiais: materiais,
    separado_por: sep.separadoPorNome,
    separado_em:  new Date(sep.separadoEm).toLocaleString('pt-BR'),
    via:          String(sep.via),
    link_sistema: window.location.origin,
  }

  for (const email of todos) {
    await send(EMAIL_CONFIG.TEMPLATES.SEPARACAO_CONFIRMADA, { ...params, to_email: email, to_name: email })
  }
}
