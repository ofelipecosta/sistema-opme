import type { AgendaStatus } from '../types/agenda'

export function agendaStatusLabel(s: AgendaStatus): string {
  const map: Record<AgendaStatus, string> = {
    agendada:              'Agendada',
    em_andamento:          'Em andamento',
    materiais_autorizados: 'Mat. Autorizados',
    vale_consignacao:      'Vale/Consignação',
    orcamento_pre:         'Orçamento pré',
    orcamento_pos:         'Orçamento pós',
    cirurgia_finalizada:   'Cirurgia finalizada',
    cirurgia_faturada:     'Cirurgia faturada',
    nova_cirurgia:         'Nova cirurgia',
    cancelada:             'Cancelada',
  }
  return map[s] || s
}

export function agendaStatusBg(s: AgendaStatus): string {
  const map: Record<AgendaStatus, string> = {
    agendada:              'bg-blue-100 text-blue-800',
    em_andamento:          'bg-yellow-100 text-yellow-800',
    materiais_autorizados: 'bg-green-100 text-green-800',
    vale_consignacao:      'bg-purple-100 text-purple-800',
    orcamento_pre:         'bg-orange-100 text-orange-800',
    orcamento_pos:         'bg-orange-100 text-orange-800',
    cirurgia_finalizada:   'bg-teal-100 text-teal-800',
    cirurgia_faturada:     'bg-teal-200 text-teal-900',
    nova_cirurgia:         'bg-cyan-100 text-cyan-800',
    cancelada:             'bg-red-100 text-red-800',
  }
  return map[s] || 'bg-gray-100 text-gray-700'
}

// For dark backgrounds (TV mode)
export function agendaStatusDark(s: AgendaStatus): string {
  const map: Record<AgendaStatus, string> = {
    agendada:              'bg-blue-600/30 text-blue-300 border-blue-500/40',
    em_andamento:          'bg-yellow-600/30 text-yellow-300 border-yellow-500/40',
    materiais_autorizados: 'bg-green-600/30 text-green-300 border-green-500/40',
    vale_consignacao:      'bg-purple-600/30 text-purple-300 border-purple-500/40',
    orcamento_pre:         'bg-orange-600/30 text-orange-300 border-orange-500/40',
    orcamento_pos:         'bg-orange-700/30 text-orange-200 border-orange-600/40',
    cirurgia_finalizada:   'bg-teal-700/30 text-teal-200 border-teal-500/40',
    cirurgia_faturada:     'bg-teal-800/40 text-teal-100 border-teal-400/40',
    nova_cirurgia:         'bg-cyan-600/30 text-cyan-300 border-cyan-500/40',
    cancelada:             'bg-red-800/30 text-red-300 border-red-500/40',
  }
  return map[s] || 'bg-slate-700/30 text-slate-300 border-slate-600/40'
}

export function agendaCardBorder(s: AgendaStatus): string {
  const map: Record<AgendaStatus, string> = {
    agendada:              'border-blue-500',
    em_andamento:          'border-yellow-400',
    materiais_autorizados: 'border-green-400',
    vale_consignacao:      'border-purple-400',
    orcamento_pre:         'border-orange-400',
    orcamento_pos:         'border-orange-500',
    cirurgia_finalizada:   'border-teal-400',
    cirurgia_faturada:     'border-teal-300',
    nova_cirurgia:         'border-cyan-400',
    cancelada:             'border-red-500',
  }
  return map[s] || 'border-slate-500'
}
