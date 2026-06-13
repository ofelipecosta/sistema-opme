import { supabase } from '../lib/supabase'

export interface Medico {
  id: string
  nome: string
  especialidade?: string
  crm?: string
  ativo: boolean
  createdAt: string
}

export interface Hospital {
  id: string
  nome: string
  cidade?: string
  ativo: boolean
  createdAt: string
}

export interface Convenio {
  id: string
  nome: string
  ativo: boolean
  createdAt: string
}

export interface Procedimento {
  id: string
  nome: string
  descricao?: string
  segmento?: string
  ativo: boolean
  createdAt: string
}

export interface KitItem {
  id: string
  procedimentoId: string
  nome: string
  ordem: number
  ativo: boolean
}

// ─── Médicos ──────────────────────────────────────────────────────────────────

export async function getMedicos(): Promise<Medico[]> {
  const { data, error } = await supabase
    .from('cadastros_medicos').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, nome: r.nome, especialidade: r.especialidade,
    crm: r.crm, ativo: r.ativo, createdAt: r.created_at,
  }))
}

export async function createMedico(nome: string, especialidade?: string, crm?: string): Promise<Medico> {
  const { data, error } = await supabase
    .from('cadastros_medicos')
    .insert({ nome: nome.trim().toUpperCase(), especialidade: especialidade || null, crm: crm || null, ativo: true })
    .select().single()
  if (error) throw error
  return { id: data.id, nome: data.nome, especialidade: data.especialidade, crm: data.crm, ativo: data.ativo, createdAt: data.created_at }
}

export async function updateMedico(id: string, patch: { nome?: string; especialidade?: string; crm?: string; ativo?: boolean }): Promise<void> {
  const up: Record<string, unknown> = {}
  if (patch.nome !== undefined) up.nome = patch.nome.trim().toUpperCase()
  if (patch.especialidade !== undefined) up.especialidade = patch.especialidade || null
  if (patch.crm !== undefined) up.crm = patch.crm || null
  if (patch.ativo !== undefined) up.ativo = patch.ativo
  const { error } = await supabase.from('cadastros_medicos').update(up).eq('id', id)
  if (error) throw error
}

export async function deleteMedico(id: string): Promise<void> {
  const { error } = await supabase.from('cadastros_medicos').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ─── Hospitais ────────────────────────────────────────────────────────────────

export async function getHospitais(): Promise<Hospital[]> {
  const { data, error } = await supabase
    .from('cadastros_hospitais').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, nome: r.nome, cidade: r.cidade, ativo: r.ativo, createdAt: r.created_at,
  }))
}

export async function createHospital(nome: string, cidade?: string): Promise<Hospital> {
  const { data, error } = await supabase
    .from('cadastros_hospitais')
    .insert({ nome: nome.trim().toUpperCase(), cidade: cidade || null, ativo: true })
    .select().single()
  if (error) throw error
  return { id: data.id, nome: data.nome, cidade: data.cidade, ativo: data.ativo, createdAt: data.created_at }
}

export async function updateHospital(id: string, patch: { nome?: string; cidade?: string; ativo?: boolean }): Promise<void> {
  const up: Record<string, unknown> = {}
  if (patch.nome !== undefined) up.nome = patch.nome.trim().toUpperCase()
  if (patch.cidade !== undefined) up.cidade = patch.cidade || null
  if (patch.ativo !== undefined) up.ativo = patch.ativo
  const { error } = await supabase.from('cadastros_hospitais').update(up).eq('id', id)
  if (error) throw error
}

export async function deleteHospital(id: string): Promise<void> {
  const { error } = await supabase.from('cadastros_hospitais').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ─── Convênios ────────────────────────────────────────────────────────────────

export async function getConvenios(): Promise<Convenio[]> {
  const { data, error } = await supabase
    .from('cadastros_convenios').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []).map(r => ({ id: r.id, nome: r.nome, ativo: r.ativo, createdAt: r.created_at }))
}

export async function createConvenio(nome: string): Promise<Convenio> {
  const { data, error } = await supabase
    .from('cadastros_convenios')
    .insert({ nome: nome.trim().toUpperCase(), ativo: true })
    .select().single()
  if (error) throw error
  return { id: data.id, nome: data.nome, ativo: data.ativo, createdAt: data.created_at }
}

export async function updateConvenio(id: string, patch: { nome?: string; ativo?: boolean }): Promise<void> {
  const up: Record<string, unknown> = {}
  if (patch.nome !== undefined) up.nome = patch.nome.trim().toUpperCase()
  if (patch.ativo !== undefined) up.ativo = patch.ativo
  const { error } = await supabase.from('cadastros_convenios').update(up).eq('id', id)
  if (error) throw error
}

export async function deleteConvenio(id: string): Promise<void> {
  const { error } = await supabase.from('cadastros_convenios').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ─── Procedimentos ────────────────────────────────────────────────────────────

export async function getProcedimentos(): Promise<Procedimento[]> {
  const { data, error } = await supabase
    .from('cadastros_procedimentos').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, nome: r.nome, descricao: r.descricao, segmento: r.segmento, ativo: r.ativo, createdAt: r.created_at,
  }))
}

export async function createProcedimento(nome: string, descricao?: string, segmento?: string): Promise<Procedimento> {
  const { data, error } = await supabase
    .from('cadastros_procedimentos')
    .insert({ nome: nome.trim().toUpperCase(), descricao: descricao || null, segmento: segmento || null, ativo: true })
    .select().single()
  if (error) throw error
  return { id: data.id, nome: data.nome, descricao: data.descricao, segmento: data.segmento, ativo: data.ativo, createdAt: data.created_at }
}

export async function updateProcedimento(id: string, patch: { nome?: string; descricao?: string; segmento?: string; ativo?: boolean }): Promise<void> {
  const up: Record<string, unknown> = {}
  if (patch.nome !== undefined) up.nome = patch.nome.trim().toUpperCase()
  if (patch.descricao !== undefined) up.descricao = patch.descricao || null
  if (patch.segmento !== undefined) up.segmento = patch.segmento || null
  if (patch.ativo !== undefined) up.ativo = patch.ativo
  const { error } = await supabase.from('cadastros_procedimentos').update(up).eq('id', id)
  if (error) throw error
}

export async function deleteProcedimento(id: string): Promise<void> {
  const { error } = await supabase.from('cadastros_procedimentos').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ─── Kit items ────────────────────────────────────────────────────────────────

export async function getKitItems(procedimentoId: string): Promise<KitItem[]> {
  const { data, error } = await supabase
    .from('procedimento_kits')
    .select('*')
    .eq('procedimento_id', procedimentoId)
    .eq('ativo', true)
    .order('ordem')
  if (error) throw error
  return (data ?? []).map(r => ({ id: r.id, procedimentoId: r.procedimento_id, nome: r.nome, ordem: r.ordem, ativo: r.ativo }))
}

export async function getKitItemsByProcedimentos(ids: string[]): Promise<KitItem[]> {
  if (!ids.length) return []
  const { data, error } = await supabase
    .from('procedimento_kits')
    .select('*')
    .in('procedimento_id', ids)
    .eq('ativo', true)
    .order('ordem')
  if (error) throw error
  return (data ?? []).map(r => ({ id: r.id, procedimentoId: r.procedimento_id, nome: r.nome, ordem: r.ordem, ativo: r.ativo }))
}

export async function createKitItem(procedimentoId: string, nome: string, ordem = 0): Promise<KitItem> {
  const { data, error } = await supabase
    .from('procedimento_kits')
    .insert({ procedimento_id: procedimentoId, nome: nome.trim().toUpperCase(), ordem, ativo: true })
    .select().single()
  if (error) throw error
  return { id: data.id, procedimentoId: data.procedimento_id, nome: data.nome, ordem: data.ordem, ativo: data.ativo }
}

export async function deleteKitItem(id: string): Promise<void> {
  const { error } = await supabase.from('procedimento_kits').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ─── File upload (Supabase Storage — private bucket) ─────────────────────────

const BUCKET = 'requisicao-anexos'

export async function uploadAnexo(
  reqId: string,
  file: File,
): Promise<{ path: string; url: string; nome: string; tipo: string; tamanho: number }> {
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${reqId}/${Date.now()}-${Math.random().toString(36).substr(2,6)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  // Store path (not public URL) — bucket is private, access via signed URLs
  return { path, url: path, nome: file.name, tipo: file.type, tamanho: file.size }
}

export async function getSignedUrl(pathOrUrl: string, expiresIn = 3600): Promise<string> {
  if (pathOrUrl.startsWith('http')) return pathOrUrl // backward compat with old public URLs
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function getSignedUrls(
  anexos: { id: string; url: string }[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    anexos.map(async a => {
      try { return [a.id, await getSignedUrl(a.url, expiresIn)] as const }
      catch { return [a.id, ''] as const }
    })
  )
  return Object.fromEntries(entries)
}

export async function deleteAnexo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
