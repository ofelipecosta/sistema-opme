import { supabase } from '../lib/supabase'

export interface ImportLog {
  id: string
  createdAt: string
  usuarioId?: string
  usuarioNome?: string
  modo: 'agenda' | 'controle'
  arquivo: string
  totalLinhas: number
  adicionados: number
  atualizados: number
  detalhes?: ImportLogDetail[]
}

export interface ImportLogDetail {
  acao: 'adicionado' | 'atualizado'
  identificador: string   // paciente name or codigo
  campos?: string[]       // fields that changed
}

function dbToLog(row: Record<string, unknown>): ImportLog {
  return {
    id:           row.id as string,
    createdAt:    row.created_at as string,
    usuarioId:    row.usuario_id as string | undefined,
    usuarioNome:  row.usuario_nome as string | undefined,
    modo:         row.modo as 'agenda' | 'controle',
    arquivo:      row.arquivo as string,
    totalLinhas:  row.total_linhas as number,
    adicionados:  row.adicionados as number,
    atualizados:  row.atualizados as number,
    detalhes:     row.detalhes as ImportLogDetail[] | undefined,
  }
}

export async function saveImportLog(log: Omit<ImportLog, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await supabase.from('import_logs').insert({
    usuario_id:   log.usuarioId   || null,
    usuario_nome: log.usuarioNome || null,
    modo:         log.modo,
    arquivo:      log.arquivo,
    total_linhas: log.totalLinhas,
    adicionados:  log.adicionados,
    atualizados:  log.atualizados,
    detalhes:     log.detalhes   || null,
  })
  if (error) console.error('saveImportLog:', error)
}

export async function getImportLogs(): Promise<ImportLog[]> {
  const { data, error } = await supabase
    .from('import_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error('getImportLogs:', error); return [] }
  return (data || []).map(r => dbToLog(r as Record<string, unknown>))
}

export async function deleteImportLog(id: string): Promise<void> {
  await supabase.from('import_logs').delete().eq('id', id)
}
