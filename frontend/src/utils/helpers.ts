import type { RequisitionStatus, SurgeryType, UserRole } from '../types'

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '-'
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

export function statusLabel(status: RequisitionStatus): string {
  const map: Record<RequisitionStatus, string> = {
    rascunho: 'Rascunho',
    enviada: 'Enviada',
    em_analise: 'Em Análise',
    aprovada: 'Aprovada',
    separacao_material: 'Separação de Material',
    material_enviado: 'Material Enviado',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }
  return map[status] || status
}

export function statusColor(status: RequisitionStatus): string {
  const map: Record<RequisitionStatus, string> = {
    rascunho:           'bg-slate-100 text-slate-500',
    enviada:            'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    em_analise:         'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    aprovada:           'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    separacao_material: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
    material_enviado:   'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
    finalizada:         'bg-teal-50 text-teal-600 ring-1 ring-teal-100',
    cancelada:          'bg-red-50 text-red-500 ring-1 ring-red-100',
  }
  return map[status] || 'bg-slate-100 text-slate-500'
}

export function surgeryTypeLabel(type: SurgeryType): string {
  return type === 'emergencia' ? 'Emergência' : 'Eletiva'
}

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin:       'Administrador',
    vendedor:    'Vendedor',
    operacional: 'Operacional',
    consulta:    'Consulta',
    estoque:     'Estoque',
  }
  return map[role] || role
}

export function roleColor(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin:       'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
    vendedor:    'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    operacional: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    consulta:    'bg-slate-100 text-slate-500',
    estoque:     'bg-orange-50 text-orange-600 ring-1 ring-orange-100',
  }
  return map[role] || 'bg-slate-100 text-slate-500'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getStatusFlow(current: RequisitionStatus): RequisitionStatus[] {
  const flow: RequisitionStatus[] = [
    'rascunho', 'enviada', 'em_analise', 'aprovada',
    'separacao_material', 'material_enviado', 'finalizada'
  ]
  const idx = flow.indexOf(current)
  return idx >= 0 ? flow.slice(idx + 1) : []
}

export const BRAZIL_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'O', label: 'Outro' },
]

export const CONVENIO_OPTIONS = [
  'Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'NotreDame Intermédica',
  'Porto Seguro Saúde', 'Hapvida', 'Particular', 'SUS', 'Outros'
]

export const ESPECIALIDADE_OPTIONS = [
  'Cardiologia', 'Neurologia', 'Neurocirurgia', 'Ortopedia', 'Traumatologia',
  'Ginecologia', 'Urologia', 'Vascular', 'Torácica', 'Coluna',
  'Oncologia', 'Oftalmologia', 'Otorrinolaringologia', 'Bucomaxilofacial', 'Outra'
]
