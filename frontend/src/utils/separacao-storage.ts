import { supabase } from '../lib/supabase'
import type { SeparacaoRecord } from '../types'

function genId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function dbToSep(row: Record<string, unknown>): SeparacaoRecord {
  return {
    id:               row.id as string,
    reqId:            (row.req_id as string) || '',
    reqNumero:        (row.req_numero as string) || '',
    separadoPorId:    (row.separado_por_id as string) || '',
    separadoPorNome:  (row.separado_por_nome as string) || '',
    separadoEm:       (row.separado_em as string) || new Date().toISOString(),
    via:              (row.via as number) || 1,
    observacao:       row.observacao as string | undefined,
  }
}

export async function getSeparacoes(): Promise<SeparacaoRecord[]> {
  const { data, error } = await supabase.from('separacoes').select('*').order('separado_em')
  if (error) { console.error('getSeparacoes:', error); return [] }
  return (data || []).map(r => dbToSep(r as Record<string, unknown>))
}

export async function getSeparacaoByReq(reqId: string): Promise<SeparacaoRecord | null> {
  const { data, error } = await supabase
    .from('separacoes')
    .select('*')
    .eq('req_id', reqId)
    .order('separado_em', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return dbToSep(data as Record<string, unknown>)
}

export async function registrarSeparacao(params: {
  reqId: string
  reqNumero: string
  separadoPorId: string
  separadoPorNome: string
  observacao?: string
}): Promise<SeparacaoRecord> {
  const { count } = await supabase
    .from('separacoes')
    .select('*', { count: 'exact', head: true })
    .eq('req_id', params.reqId)
  const via = (count ?? 0) + 1
  const now = new Date().toISOString()

  const { data, error } = await supabase.from('separacoes').insert({
    id:               genId(),
    req_id:           params.reqId,
    req_numero:       params.reqNumero,
    separado_por_id:  params.separadoPorId,
    separado_por_nome: params.separadoPorNome,
    separado_em:      now,
    via,
    observacao:       params.observacao || null,
    created_at:       now,
  }).select().single()

  if (error) throw error
  return dbToSep(data as Record<string, unknown>)
}

export async function getHistoricoSeparacao(reqId: string): Promise<SeparacaoRecord[]> {
  const { data, error } = await supabase
    .from('separacoes')
    .select('*')
    .eq('req_id', reqId)
    .order('separado_em')
  if (error) { console.error('getHistoricoSeparacao:', error); return [] }
  return (data || []).map(r => dbToSep(r as Record<string, unknown>))
}
