export type AgendaStatus =
  | 'agendada'
  | 'em_andamento'
  | 'materiais_autorizados'
  | 'vale_consignacao'
  | 'orcamento_pre'
  | 'orcamento_pos'
  | 'cirurgia_finalizada'
  | 'cirurgia_faturada'
  | 'nova_cirurgia'
  | 'cancelada'

export interface AgendaItem {
  id: string
  codigo?: string
  data: string           // YYYY-MM-DD
  horaCirurgia: string   // HH:MM
  paciente: string
  hospital: string
  convenio: string
  medico: string
  cliente?: string
  procedimento: string
  instrumentadores?: string
  vendedor: string
  autorizada: boolean
  emergencia?: boolean
  status: AgendaStatus
  importadoEm: string
  importadoPor: string
  origem: 'importacao' | 'manual'
}
