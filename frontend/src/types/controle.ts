export type SegmentoCirurgia = 'ortopedia' | 'trauma' | 'neuro' | 'coluna'
export type SituacaoCirurgia = 'urgencia' | 'autorizada' | 'expedida'
export type AcompanhamentoCirurgia = 'opme_pos' | 'agendada' | 'cancelada' | 'expedida'

export interface ControleCirurgia {
  id: string
  numero?: string
  codigoV2?: string
  data: string           // YYYY-MM-DD
  cirurgia: string
  segmento: SegmentoCirurgia
  pacienteNome: string
  convenio?: string
  hospital?: string
  medico?: string
  vendedor?: string
  situacao: SituacaoCirurgia
  acompanhamento: AcompanhamentoCirurgia
  observacao?: string
  criadoPorId?: string
  criadoPorNome?: string
  createdAt: string
  updatedAt: string
}

export const SEGMENTO_LABELS: Record<SegmentoCirurgia, string> = {
  ortopedia: 'Ortopedia',
  trauma: 'Trauma',
  neuro: 'Neuro',
  coluna: 'Coluna',
}

export const SITUACAO_LABELS: Record<SituacaoCirurgia, string> = {
  urgencia: 'Urgência',
  autorizada: 'Autorizada',
  expedida: 'Expedida',
}

export const ACOMPANHAMENTO_LABELS: Record<AcompanhamentoCirurgia, string> = {
  opme_pos: 'OPME Pós',
  agendada: 'Agendada',
  cancelada: 'Cancelada',
  expedida: 'Expedida',
}
