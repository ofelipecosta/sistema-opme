import { supabase } from '../lib/supabase'
import type { ControleCirurgia, SituacaoCirurgia, AcompanhamentoCirurgia } from '../types/controle'

function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function dbToItem(row: Record<string, unknown>): ControleCirurgia {
  return {
    id:               row.id as string,
    numero:           row.numero as string | undefined,
    codigoV2:         row.codigo_v2 as string | undefined,
    data:             row.data as string,
    cirurgia:         row.cirurgia as string,
    segmento:         row.segmento as ControleCirurgia['segmento'],
    pacienteNome:     row.paciente_nome as string,
    convenio:         row.convenio as string | undefined,
    hospital:         row.hospital as string | undefined,
    medico:           row.medico as string | undefined,
    vendedor:         row.vendedor as string | undefined,
    situacao:         row.situacao as SituacaoCirurgia,
    acompanhamento:   row.acompanhamento as AcompanhamentoCirurgia,
    observacao:       row.observacao as string | undefined,
    criadoPorId:      row.criado_por_id as string | undefined,
    criadoPorNome:    row.criado_por_nome as string | undefined,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  }
}

function itemToDb(item: Partial<ControleCirurgia>): Record<string, unknown> {
  return {
    numero:           item.numero || null,
    codigo_v2:        item.codigoV2 || null,
    data:             item.data,
    cirurgia:         item.cirurgia,
    segmento:         item.segmento,
    paciente_nome:    item.pacienteNome,
    convenio:         item.convenio || null,
    hospital:         item.hospital || null,
    medico:           item.medico || null,
    vendedor:         item.vendedor || null,
    situacao:         item.situacao,
    acompanhamento:   item.acompanhamento,
    observacao:       item.observacao || null,
    criado_por_id:    item.criadoPorId || null,
    criado_por_nome:  item.criadoPorNome || null,
    updated_at:       new Date().toISOString(),
  }
}

export async function getControleCirurgias(): Promise<ControleCirurgia[]> {
  const { data, error } = await supabase
    .from('controle_cirurgias')
    .select('*')
    .order('data', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dbToItem)
}

export async function createControleCirurgia(
  item: Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ControleCirurgia> {
  const now = new Date().toISOString()
  const row = { id: genId(), ...itemToDb(item), created_at: now, updated_at: now }
  const { data, error } = await supabase.from('controle_cirurgias').insert(row).select().single()
  if (error) throw error
  return dbToItem(data)
}

export async function updateControleCirurgia(
  id: string,
  patch: Partial<Omit<ControleCirurgia, 'id' | 'createdAt'>>
): Promise<void> {
  const { error } = await supabase
    .from('controle_cirurgias')
    .update({ ...itemToDb(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteControleCirurgia(id: string): Promise<void> {
  const { error } = await supabase.from('controle_cirurgias').delete().eq('id', id)
  if (error) throw error
}

export async function clearControleCirurgias(): Promise<void> {
  // Busca todos os IDs e deleta em chunks para contornar restrições de RLS
  const { data, error: fetchError } = await supabase
    .from('controle_cirurgias')
    .select('id')
  if (fetchError) throw fetchError
  if (!data?.length) return
  const ids = data.map(r => r.id as string)
  const CHUNK = 200
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from('controle_cirurgias')
      .delete()
      .in('id', ids.slice(i, i + CHUNK))
    if (error) throw error
  }
}

export async function countControleCirurgias(): Promise<number> {
  const { count, error } = await supabase.from('controle_cirurgias').select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export interface UpsertControleResult {
  added: number
  updated: number
  details: { acao: 'adicionado' | 'atualizado'; identificador: string; campos?: string[] }[]
}

export async function bulkUpsertControleCirurgias(
  items: Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt'>[],
  onProgress?: (pct: number) => void,
): Promise<UpsertControleResult> {
  if (!items.length) return { added: 0, updated: 0, details: [] }

  onProgress?.(5)
  const existing = await getControleCirurgias()
  onProgress?.(20)
  const now = new Date().toISOString()

  const toInsert: Record<string, unknown>[] = []
  const toUpdate: { id: string; row: Record<string, unknown> }[] = []
  const details: UpsertControleResult['details'] = []

  for (const item of items) {
    const match = existing.find(e => {
      if (item.numero && e.numero) return e.numero === item.numero
      if (item.codigoV2 && e.codigoV2) return e.codigoV2 === item.codigoV2
      return e.data === item.data &&
        e.pacienteNome.trim().toLowerCase() === (item.pacienteNome || '').trim().toLowerCase()
    })

    if (match) {
      const merged: Partial<ControleCirurgia> = { ...match }
      const changedFields: string[] = []
      for (const key of Object.keys(item) as (keyof typeof item)[]) {
        const v = item[key]
        if (v !== '' && v !== null && v !== undefined) {
          if (String((match as Record<string, unknown>)[key] ?? '') !== String(v)) changedFields.push(key)
          ;(merged as Record<string, unknown>)[key] = v
        }
      }
      toUpdate.push({ id: match.id, row: { ...itemToDb(merged), updated_at: now } })
      details.push({ acao: 'atualizado', identificador: item.pacienteNome || item.numero || '', campos: changedFields })
    } else {
      toInsert.push({ id: genId(), ...itemToDb(item), created_at: now, updated_at: now })
      details.push({ acao: 'adicionado', identificador: item.pacienteNome || '' })
    }
  }

  onProgress?.(35)
  const CHUNK = 200
  const totalOps = Math.ceil(toInsert.length / CHUNK) + Math.ceil(toUpdate.length / CHUNK)

  let ops = 0
  const tick = () => { ops++; onProgress?.(35 + Math.round((ops / (totalOps || 1)) * 60)) }

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const { error } = await supabase.from('controle_cirurgias').insert(toInsert.slice(i, i + CHUNK))
    if (error) throw error
    tick()
  }

  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK)
    for (const { id, row } of chunk) {
      const { error } = await supabase.from('controle_cirurgias').update(row).eq('id', id)
      if (error) throw error
    }
    tick()
  }

  onProgress?.(100)
  return { added: toInsert.length, updated: toUpdate.length, details }
}

// Keep old name as alias for backwards compat
export async function bulkInsertControleCirurgias(
  items: Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt'>[],
): Promise<number> {
  const { added, updated } = await bulkUpsertControleCirurgias(items)
  return added + updated
}
