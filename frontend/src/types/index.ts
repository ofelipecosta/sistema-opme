export type UserRole = 'admin' | 'vendedor' | 'operacional' | 'consulta' | 'estoque'

export interface SeparacaoRecord {
  id: string
  reqId: string
  reqNumero: string
  separadoPorId: string
  separadoPorNome: string
  separadoEm: string  // ISO
  via: number         // 1 = primeira, 2+ = segunda via
  observacao?: string
}
export type UserStatus = 'ativo' | 'inativo'
export type SurgeryType = 'emergencia' | 'eletiva'
export type RequisitionStatus =
  | 'rascunho'
  | 'enviada'
  | 'em_analise'
  | 'aprovada'
  | 'separacao_material'
  | 'material_enviado'
  | 'finalizada'
  | 'cancelada'

export interface User {
  id: string
  nome: string
  email: string
  telefone: string
  cargo: string
  empresa: string
  login: string
  senha?: string
  perfil: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface OPMEItem {
  id: string
  codigo: string
  descricao: string
  fabricante: string
  quantidade: number
  unidade: string
  observacao: string
}

export interface Attachment {
  id: string
  nome: string
  tipo: string
  tamanho: number
  url: string
  uploadedAt: string
  uploadedBy: string
}

export interface AuditLog {
  id: string
  requisicaoId: string
  usuarioId: string
  usuarioNome: string
  acao: string
  detalhes: string
  ip: string
  createdAt: string
}

export interface Requisition {
  id: string
  numero: string
  tipoCirurgia: SurgeryType
  status: RequisitionStatus
  datasolicitacao: string
  solicitanteId: string
  solicitanteNome: string

  // Vendedor
  vendedorNome: string
  vendedorTelefone: string
  vendedorEmail: string

  // Hospital
  hospitalNome: string
  hospitalCidade: string
  hospitalEstado: string
  hospitalSetor: string
  hospitalCentroCirurgico: string
  hospitalContato: string

  // Médico
  medicoNome: string
  medicoEspecialidade: string
  medicoCRM: string

  // Paciente
  pacienteNome: string
  pacienteDataNascimento: string
  pacienteProntuario: string
  pacienteSexo: string

  // Instrumentador
  instrumentadorNome: string
  instrumentadorTelefone: string
  instrumentadorEmpresa: string

  // Cirurgia
  cirurgiaData: string
  cirurgiaHorario: string
  cirurgiaProcedimento: string
  cirurgiaConvenio: string
  cirurgiaCodTUSS: string
  cirurgiaSala: string

  // Materiais
  materiais: OPMEItem[]

  // Geral
  observacoesGerais: string
  anexos: Attachment[]
  auditoria: AuditLog[]

  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalCirurgias: number
  cirurgiasEletivas: number
  cirurgiasEmergencia: number
  solicitacoesPendentes: number
  solicitacoesFinalizadas: number
  materiaisMaisSolicitados: { descricao: string; quantidade: number }[]
  hospitaisVolume: { nome: string; total: number }[]
  medicosVolume: { nome: string; total: number }[]
  statusDistribuicao: { status: string; total: number }[]
  volumeMensal: { mes: string; total: number }[]
}

export interface FilterParams {
  periodo?: { inicio: string; fim: string }
  hospital?: string
  medico?: string
  convenio?: string
  vendedor?: string
  tipoCirurgia?: SurgeryType
  status?: RequisitionStatus
  search?: string
}
