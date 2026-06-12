import { supabase } from '../lib/supabase'
import type { User, Requisition } from '../types'

// ─── session (still localStorage — per-browser) ──────────────────────────────

export function getCurrentUser(): User | null {
  const data = localStorage.getItem('opme_current_user')
  if (!data) return null
  return JSON.parse(data)
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('opme_current_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('opme_current_user')
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function genAuditId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

async function generateReqNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase.from('requisicoes').select('*', { count: 'exact', head: true })
  const seq = String((count ?? 0) + 1).padStart(5, '0')
  return `REQ-${year}-${seq}`
}

// ─── row → type mappers ───────────────────────────────────────────────────────

function dbToUser(row: Record<string, unknown>): User {
  return {
    id:         row.id as string,
    nome:       row.nome as string,
    email:      (row.email as string) || '',
    telefone:   (row.telefone as string) || '',
    cargo:      (row.cargo as string) || '',
    empresa:    (row.empresa as string) || '',
    login:      row.login as string,
    senha:      (row.senha as string) || '',
    perfil:     row.perfil as User['perfil'],
    status:     row.status as User['status'],
    createdAt:  row.created_at as string,
    updatedAt:  row.updated_at as string,
  }
}

function dbToReq(row: Record<string, unknown>): Requisition {
  return {
    id:                       row.id as string,
    numero:                   row.numero as string,
    tipoCirurgia:             row.tipo_cirurgia as Requisition['tipoCirurgia'],
    status:                   row.status as Requisition['status'],
    datasolicitacao:          row.data_solicitacao as string,
    solicitanteId:            (row.solicitante_id as string) || '',
    solicitanteNome:          (row.solicitante_nome as string) || '',
    vendedorNome:             (row.vendedor_nome as string) || '',
    vendedorTelefone:         (row.vendedor_telefone as string) || '',
    vendedorEmail:            (row.vendedor_email as string) || '',
    hospitalNome:             (row.hospital_nome as string) || '',
    hospitalCidade:           (row.hospital_cidade as string) || '',
    hospitalEstado:           (row.hospital_estado as string) || '',
    hospitalSetor:            (row.hospital_setor as string) || '',
    hospitalCentroCirurgico:  (row.hospital_centro_cirurgico as string) || '',
    hospitalContato:          (row.hospital_contato as string) || '',
    medicoNome:               (row.medico_nome as string) || '',
    medicoEspecialidade:      (row.medico_especialidade as string) || '',
    medicoCRM:                (row.medico_crm as string) || '',
    pacienteNome:             (row.paciente_nome as string) || '',
    pacienteDataNascimento:   (row.paciente_data_nascimento as string) || '',
    pacienteProntuario:       (row.paciente_prontuario as string) || '',
    pacienteSexo:             (row.paciente_sexo as string) || '',
    instrumentadorNome:       (row.instrumentador_nome as string) || '',
    instrumentadorTelefone:   (row.instrumentador_telefone as string) || '',
    instrumentadorEmpresa:    (row.instrumentador_empresa as string) || '',
    cirurgiaData:             (row.cirurgia_data as string) || '',
    cirurgiaHorario:          (row.cirurgia_horario as string) || '',
    cirurgiaProcedimento:     (row.cirurgia_procedimento as string) || '',
    cirurgiaConvenio:         (row.cirurgia_convenio as string) || '',
    cirurgiaCodTUSS:          (row.cirurgia_cod_tuss as string) || '',
    cirurgiaSala:             (row.cirurgia_sala as string) || '',
    materiais:                (row.materiais as Requisition['materiais']) || [],
    observacoesGerais:        (row.observacoes_gerais as string) || '',
    anexos:                   (row.anexos as Requisition['anexos']) || [],
    auditoria:                (row.auditoria as Requisition['auditoria']) || [],
    createdAt:                row.created_at as string,
    updatedAt:                row.updated_at as string,
  }
}

// ─── usuarios ────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('usuarios').select('*').order('nome')
  if (error) { console.error('getUsers:', error); return [] }
  return (data || []).map(dbToUser)
}

export async function saveUsers(users: User[]): Promise<void> {
  for (const u of users) {
    const { error } = await supabase.from('usuarios').upsert({
      id:         u.id,
      nome:       u.nome,
      email:      u.email,
      telefone:   u.telefone,
      cargo:      u.cargo,
      empresa:    u.empresa,
      login:      u.login,
      senha:      u.senha || '',
      perfil:     u.perfil,
      status:     u.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (error) console.error('saveUsers upsert:', error)
  }
}

export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const now = new Date().toISOString()
  const { data: row, error } = await supabase.from('usuarios').insert({
    nome:       data.nome,
    email:      data.email,
    telefone:   data.telefone,
    cargo:      data.cargo,
    empresa:    data.empresa,
    login:      data.login,
    senha:      data.senha || '',
    perfil:     data.perfil,
    status:     data.status,
    created_at: now,
    updated_at: now,
  }).select().single()
  if (error) throw error
  return dbToUser(row as Record<string, unknown>)
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.nome      !== undefined) patch.nome       = data.nome
  if (data.email     !== undefined) patch.email      = data.email
  if (data.telefone  !== undefined) patch.telefone   = data.telefone
  if (data.cargo     !== undefined) patch.cargo      = data.cargo
  if (data.empresa   !== undefined) patch.empresa    = data.empresa
  if (data.login     !== undefined) patch.login      = data.login
  if (data.senha     !== undefined && data.senha) patch.senha = data.senha
  if (data.perfil    !== undefined) patch.perfil     = data.perfil
  if (data.status    !== undefined) patch.status     = data.status

  const { data: row, error } = await supabase.from('usuarios').update(patch).eq('id', id).select().single()
  if (error) throw error
  return dbToUser(row as Record<string, unknown>)
}

export async function deleteUser(id: string): Promise<boolean> {
  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) { console.error('deleteUser:', error); return false }
  return true
}

export async function getUserByLogin(login: string): Promise<User | null> {
  const { data, error } = await supabase.from('usuarios').select('*').eq('login', login).limit(1)
  if (error) { console.error('getUserByLogin error:', JSON.stringify(error)); return null }
  if (!data || data.length === 0) return null
  const row = data[0]
  if (row.status !== 'ativo') return null
  return dbToUser(row as Record<string, unknown>)
}

// ─── requisicoes ─────────────────────────────────────────────────────────────

export async function getRequisitions(): Promise<Requisition[]> {
  const { data, error } = await supabase
    .from('requisicoes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) { console.error('getRequisitions:', error); return [] }
  return (data || []).map(r => dbToReq(r as Record<string, unknown>))
}

export async function getRequisitionById(id: string): Promise<Requisition | null> {
  const { data, error } = await supabase.from('requisicoes').select('*').eq('id', id).single()
  if (error || !data) return null
  return dbToReq(data as Record<string, unknown>)
}

export async function createRequisition(partial: Partial<Requisition>, user: User): Promise<Requisition> {
  const numero = await generateReqNumber()
  const now = new Date().toISOString()

  const { data, error } = await supabase.from('requisicoes').insert({
    numero,
    tipo_cirurgia:             partial.tipoCirurgia || 'eletiva',
    status:                    partial.status || 'rascunho',
    data_solicitacao:          now,
    solicitante_id:            user.id,
    solicitante_nome:          user.nome,
    vendedor_nome:             partial.vendedorNome || '',
    vendedor_telefone:         partial.vendedorTelefone || '',
    vendedor_email:            partial.vendedorEmail || '',
    hospital_nome:             partial.hospitalNome || '',
    hospital_cidade:           partial.hospitalCidade || '',
    hospital_estado:           partial.hospitalEstado || '',
    hospital_setor:            partial.hospitalSetor || '',
    hospital_centro_cirurgico: partial.hospitalCentroCirurgico || '',
    hospital_contato:          partial.hospitalContato || '',
    medico_nome:               partial.medicoNome || '',
    medico_especialidade:      partial.medicoEspecialidade || '',
    medico_crm:                partial.medicoCRM || '',
    paciente_nome:             partial.pacienteNome || '',
    paciente_data_nascimento:  partial.pacienteDataNascimento || '',
    paciente_prontuario:       partial.pacienteProntuario || '',
    paciente_sexo:             partial.pacienteSexo || '',
    instrumentador_nome:       partial.instrumentadorNome || '',
    instrumentador_telefone:   partial.instrumentadorTelefone || '',
    instrumentador_empresa:    partial.instrumentadorEmpresa || '',
    cirurgia_data:             partial.cirurgiaData || '',
    cirurgia_horario:          partial.cirurgiaHorario || '',
    cirurgia_procedimento:     partial.cirurgiaProcedimento || '',
    cirurgia_convenio:         partial.cirurgiaConvenio || '',
    cirurgia_cod_tuss:         partial.cirurgiaCodTUSS || '',
    cirurgia_sala:             partial.cirurgiaSala || '',
    materiais:                 partial.materiais || [],
    observacoes_gerais:        partial.observacoesGerais || '',
    anexos:                    partial.anexos || [],
    auditoria:                 [{
      id:           genAuditId(),
      requisicaoId: '',
      usuarioId:    user.id,
      usuarioNome:  user.nome,
      acao:         'Criação',
      detalhes:     'Requisição criada',
      ip:           '127.0.0.1',
      createdAt:    now,
    }],
    created_at: now,
    updated_at: now,
  }).select().single()

  if (error) throw error
  return dbToReq(data as Record<string, unknown>)
}

export async function updateRequisition(
  id: string,
  partial: Partial<Requisition>,
  user: User,
  action?: string,
): Promise<Requisition | null> {
  const now = new Date().toISOString()

  // Fetch current auditoria
  const { data: current } = await supabase.from('requisicoes').select('auditoria').eq('id', id).single()
  const auditoria = [...((current?.auditoria as unknown[]) || []), {
    id:           genAuditId(),
    requisicaoId: id,
    usuarioId:    user.id,
    usuarioNome:  user.nome,
    acao:         action || 'Atualização',
    detalhes:     action || 'Requisição atualizada',
    ip:           '127.0.0.1',
    createdAt:    now,
  }]

  const patch: Record<string, unknown> = { updated_at: now, auditoria }
  if (partial.tipoCirurgia          !== undefined) patch.tipo_cirurgia             = partial.tipoCirurgia
  if (partial.status                !== undefined) patch.status                    = partial.status
  if (partial.vendedorNome          !== undefined) patch.vendedor_nome             = partial.vendedorNome
  if (partial.vendedorTelefone      !== undefined) patch.vendedor_telefone         = partial.vendedorTelefone
  if (partial.vendedorEmail         !== undefined) patch.vendedor_email            = partial.vendedorEmail
  if (partial.hospitalNome          !== undefined) patch.hospital_nome             = partial.hospitalNome
  if (partial.hospitalCidade        !== undefined) patch.hospital_cidade           = partial.hospitalCidade
  if (partial.hospitalEstado        !== undefined) patch.hospital_estado           = partial.hospitalEstado
  if (partial.hospitalSetor         !== undefined) patch.hospital_setor            = partial.hospitalSetor
  if (partial.hospitalCentroCirurgico !== undefined) patch.hospital_centro_cirurgico = partial.hospitalCentroCirurgico
  if (partial.hospitalContato       !== undefined) patch.hospital_contato          = partial.hospitalContato
  if (partial.medicoNome            !== undefined) patch.medico_nome               = partial.medicoNome
  if (partial.medicoEspecialidade   !== undefined) patch.medico_especialidade      = partial.medicoEspecialidade
  if (partial.medicoCRM             !== undefined) patch.medico_crm                = partial.medicoCRM
  if (partial.pacienteNome          !== undefined) patch.paciente_nome             = partial.pacienteNome
  if (partial.pacienteDataNascimento !== undefined) patch.paciente_data_nascimento = partial.pacienteDataNascimento
  if (partial.pacienteProntuario    !== undefined) patch.paciente_prontuario       = partial.pacienteProntuario
  if (partial.pacienteSexo          !== undefined) patch.paciente_sexo             = partial.pacienteSexo
  if (partial.instrumentadorNome    !== undefined) patch.instrumentador_nome       = partial.instrumentadorNome
  if (partial.instrumentadorTelefone !== undefined) patch.instrumentador_telefone  = partial.instrumentadorTelefone
  if (partial.instrumentadorEmpresa !== undefined) patch.instrumentador_empresa    = partial.instrumentadorEmpresa
  if (partial.cirurgiaData          !== undefined) patch.cirurgia_data             = partial.cirurgiaData
  if (partial.cirurgiaHorario       !== undefined) patch.cirurgia_horario          = partial.cirurgiaHorario
  if (partial.cirurgiaProcedimento  !== undefined) patch.cirurgia_procedimento     = partial.cirurgiaProcedimento
  if (partial.cirurgiaConvenio      !== undefined) patch.cirurgia_convenio         = partial.cirurgiaConvenio
  if (partial.cirurgiaCodTUSS       !== undefined) patch.cirurgia_cod_tuss         = partial.cirurgiaCodTUSS
  if (partial.cirurgiaSala          !== undefined) patch.cirurgia_sala             = partial.cirurgiaSala
  if (partial.materiais             !== undefined) patch.materiais                 = partial.materiais
  if (partial.observacoesGerais     !== undefined) patch.observacoes_gerais        = partial.observacoesGerais
  if (partial.anexos                !== undefined) patch.anexos                    = partial.anexos

  const { data, error } = await supabase.from('requisicoes').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateRequisition:', error); return null }
  return dbToReq(data as Record<string, unknown>)
}

export async function deleteRequisition(id: string, user: User): Promise<boolean> {
  const now = new Date().toISOString()
  const { data: current } = await supabase.from('requisicoes').select('auditoria').eq('id', id).single()
  const auditoria = [...((current?.auditoria as unknown[]) || []), {
    id:           genAuditId(),
    requisicaoId: id,
    usuarioId:    user.id,
    usuarioNome:  user.nome,
    acao:         'Exclusão',
    detalhes:     `Requisição excluída por ${user.nome}`,
    ip:           '127.0.0.1',
    createdAt:    now,
  }]
  const { error } = await supabase.from('requisicoes').update({
    deleted_at: now, status: 'cancelada', updated_at: now, auditoria,
  }).eq('id', id)
  if (error) { console.error('deleteRequisition:', error); return false }
  return true
}
