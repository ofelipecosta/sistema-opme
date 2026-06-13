import { supabase } from '../lib/supabase'
import type { AgendaItem, AgendaStatus } from '../types/agenda'

function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

// ─── row → AgendaItem ────────────────────────────────────────────────────────

function dbToItem(row: Record<string, unknown>): AgendaItem {
  return {
    id:               row.id as string,
    codigo:           row.codigo as string | undefined,
    data:             (row.data as string) || '',
    horaCirurgia:     (row.hora_cirurgia as string) || '',
    paciente:         (row.paciente as string) || '',
    hospital:         (row.hospital as string) || '',
    convenio:         (row.convenio as string) || '',
    medico:           (row.medico as string) || '',
    cliente:          row.cliente as string | undefined,
    procedimento:     (row.procedimento as string) || '',
    instrumentadores: row.instrumentadores as string | undefined,
    vendedor:         (row.vendedor as string) || '',
    autorizada:       (row.autorizada as boolean) || false,
    emergencia:       (row.emergencia as boolean) || false,
    status:           (row.status as AgendaStatus) || 'agendada',
    importadoEm:      (row.importado_em as string) || new Date().toISOString(),
    importadoPor:     (row.importado_por as string) || '',
    origem:           (row.origem as AgendaItem['origem']) || 'manual',
  }
}

function itemToDb(item: AgendaItem): Record<string, unknown> {
  return {
    id:               item.id,
    codigo:           item.codigo || null,
    data:             item.data,
    hora_cirurgia:    item.horaCirurgia,
    paciente:         item.paciente,
    hospital:         item.hospital,
    convenio:         item.convenio,
    medico:           item.medico,
    cliente:          item.cliente || null,
    procedimento:     item.procedimento,
    instrumentadores: item.instrumentadores || null,
    vendedor:         item.vendedor,
    autorizada:       item.autorizada,
    emergencia:       item.emergencia || false,
    status:           item.status,
    importado_em:     item.importadoEm,
    importado_por:    item.importadoPor,
    origem:           item.origem,
    updated_at:       new Date().toISOString(),
  }
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function getAgenda(): Promise<AgendaItem[]> {
  const { data, error } = await supabase.from('agenda').select('*').order('data').order('hora_cirurgia')
  if (error) { console.error('getAgenda:', error); return [] }
  return (data || []).map(r => dbToItem(r as Record<string, unknown>))
}

export interface UpsertResult {
  added: number
  updated: number
  details: { acao: 'adicionado' | 'atualizado'; identificador: string; campos?: string[] }[]
}

export async function upsertAgendaItems(
  items: AgendaItem[],
  onProgress?: (pct: number) => void,
): Promise<UpsertResult> {
  onProgress?.(5)
  const existing = await getAgenda()
  onProgress?.(20)
  let added = 0, updated = 0
  const toUpsert: Record<string, unknown>[] = []
  const details: UpsertResult['details'] = []

  for (const item of items) {
    const idx = existing.findIndex(e =>
      e.codigo && item.codigo
        ? e.codigo === item.codigo
        : e.data === item.data && e.horaCirurgia === item.horaCirurgia &&
          e.paciente.toLowerCase() === item.paciente.toLowerCase() &&
          e.hospital.toLowerCase() === item.hospital.toLowerCase()
    )
    if (idx !== -1) {
      const merged = { ...existing[idx] }
      const changedFields: string[] = []
      for (const key of Object.keys(item) as (keyof AgendaItem)[]) {
        const v = item[key]
        if (v !== '' && v !== null && v !== undefined && key !== 'id') {
          if (String(existing[idx][key] ?? '') !== String(v)) changedFields.push(key)
          ;(merged as Record<string, unknown>)[key] = v
        }
      }
      toUpsert.push(itemToDb(merged))
      updated++
      details.push({ acao: 'atualizado', identificador: item.paciente || item.codigo || '', campos: changedFields })
    } else {
      toUpsert.push(itemToDb({ ...item, id: item.id || genId() }))
      added++
      details.push({ acao: 'adicionado', identificador: item.paciente || item.codigo || '' })
    }
  }

  onProgress?.(40)
  const CHUNK = 200
  const totalChunks = Math.ceil(toUpsert.length / CHUNK) || 1
  for (let i = 0; i < toUpsert.length; i += CHUNK) {
    const { error } = await supabase.from('agenda').upsert(toUpsert.slice(i, i + CHUNK), { onConflict: 'id' })
    if (error) { console.error('upsertAgendaItems:', error) }
    onProgress?.(40 + Math.round(((i / CHUNK + 1) / totalChunks) * 55))
  }
  if (!toUpsert.length) onProgress?.(95)
  return { added, updated, details }
}

export async function syncRequisitionToAgenda(req: {
  id: string
  pacienteNome?: string
  hospitalNome?: string
  medicoNome?: string
  cirurgiaConvenio?: string
  cirurgiaData?: string
  cirurgiaHorario?: string
  vendedorNome?: string
  cirurgiaProcedimento?: string
  tipoCirurgia?: string
  solicitanteNome?: string
  instrumentadorNome?: string
  status?: string
}): Promise<void> {
  const agendaId = `req_${req.id}`
  const now = new Date().toISOString()

  const { data: existing } = await supabase.from('agenda').select('*').eq('id', agendaId).single()

  const item: Record<string, unknown> = {
    id:              agendaId,
    data:            req.cirurgiaData || '',
    hora_cirurgia:   req.cirurgiaHorario || '',
    paciente:        req.pacienteNome || '',
    hospital:        req.hospitalNome || '',
    convenio:        req.cirurgiaConvenio || '',
    medico:          req.medicoNome || '',
    procedimento:    req.cirurgiaProcedimento || '',
    vendedor:        req.vendedorNome || '',
    instrumentadores: req.instrumentadorNome || null,
    emergencia:      req.tipoCirurgia === 'emergencia',
    importado_em:    now,
    importado_por:   req.solicitanteNome || '',
    origem:          'manual',
    updated_at:      now,
  }

  if (existing) {
    // Keep existing status & autorizada
    item.status     = existing.status
    item.autorizada = existing.autorizada
    await supabase.from('agenda').update(item).eq('id', agendaId)
  } else {
    item.status     = 'agendada'
    item.autorizada = false
    item.created_at = now
    await supabase.from('agenda').insert(item)
  }

  window.dispatchEvent(new CustomEvent('opme_agenda_updated'))
}

export async function updateAgendaItem(id: string, patch: Partial<AgendaItem>): Promise<void> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.codigo          !== undefined) dbPatch.codigo           = patch.codigo
  if (patch.data            !== undefined) dbPatch.data             = patch.data
  if (patch.horaCirurgia    !== undefined) dbPatch.hora_cirurgia    = patch.horaCirurgia
  if (patch.paciente        !== undefined) dbPatch.paciente         = patch.paciente
  if (patch.hospital        !== undefined) dbPatch.hospital         = patch.hospital
  if (patch.convenio        !== undefined) dbPatch.convenio         = patch.convenio
  if (patch.medico          !== undefined) dbPatch.medico           = patch.medico
  if (patch.cliente         !== undefined) dbPatch.cliente          = patch.cliente
  if (patch.procedimento    !== undefined) dbPatch.procedimento     = patch.procedimento
  if (patch.instrumentadores !== undefined) dbPatch.instrumentadores = patch.instrumentadores
  if (patch.vendedor        !== undefined) dbPatch.vendedor         = patch.vendedor
  if (patch.autorizada      !== undefined) dbPatch.autorizada       = patch.autorizada
  if (patch.emergencia      !== undefined) dbPatch.emergencia       = patch.emergencia
  if (patch.status          !== undefined) dbPatch.status           = patch.status
  if (patch.importadoEm     !== undefined) dbPatch.importado_em     = patch.importadoEm
  if (patch.importadoPor    !== undefined) dbPatch.importado_por    = patch.importadoPor
  if (patch.origem          !== undefined) dbPatch.origem           = patch.origem

  const { error } = await supabase.from('agenda').update(dbPatch).eq('id', id)
  if (error) console.error('updateAgendaItem:', error)
}

export async function updateAgendaStatus(id: string, status: AgendaStatus): Promise<void> {
  const { error } = await supabase.from('agenda').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) console.error('updateAgendaStatus:', error)
}

export async function updateAgendaAutorizada(id: string, autorizada: boolean): Promise<void> {
  const { error } = await supabase.from('agenda').update({ autorizada, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) console.error('updateAgendaAutorizada:', error)
}

export async function deleteAgendaItem(id: string): Promise<void> {
  const { error } = await supabase.from('agenda').delete().eq('id', id)
  if (error) console.error('deleteAgendaItem:', error)
}

export async function clearAgenda(): Promise<void> {
  const { error } = await supabase.from('agenda').delete().neq('id', '')
  if (error) console.error('clearAgenda:', error)
}

// ─── parse helpers (unchanged — pure functions) ──────────────────────────────

export function parseStatus(raw: string): AgendaStatus {
  const s = (raw || '').toLowerCase().trim()
  if (s.includes('finaliz')) return 'cirurgia_finalizada'
  if (s.includes('fatur'))   return 'cirurgia_faturada'
  if (s.includes('andamento')) return 'em_andamento'
  if (s.includes('autorizad')) return 'materiais_autorizados'
  if (s.includes('vale') || s.includes('consig')) return 'vale_consignacao'
  if (s.includes('pré') || s.includes('pre'))     return 'orcamento_pre'
  if (s.includes('pós') || s.includes('pos'))     return 'orcamento_pos'
  if (s.includes('nova'))   return 'nova_cirurgia'
  if (s.includes('cancel')) return 'cancelada'
  if (s.includes('agend'))  return 'agendada'
  return 'agendada'
}

export function parseDate(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  if (typeof val === 'string') {
    // Serial numérico do Excel vindo como string (ex: "46023")
    if (/^\d{4,6}$/.test(val.trim())) {
      const d = new Date((Number(val) - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    const m = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3]
      return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }
    const iso = new Date(val)
    if (!isNaN(iso.getTime())) return iso.toISOString().split('T')[0]
  }
  return String(val)
}

export function parseTime(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') {
    const m = val.match(/(\d{1,2}):(\d{2})/)
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  if (typeof val === 'number') {
    const totalMin = Math.round(val * 24 * 60)
    const h = Math.floor(totalMin / 60) % 24
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return String(val)
}

const COL_MAP: Record<string, keyof AgendaItem | 'skip'> = {
  'cód': 'codigo', 'cod': 'codigo', 'código': 'codigo',
  'data': 'data',
  'hora': 'horaCirurgia', 'hora da cirurgia': 'horaCirurgia', 'horário': 'horaCirurgia',
  'paciente': 'paciente',
  'hospital': 'hospital',
  'convênio': 'convenio', 'convenio': 'convenio', 'conv': 'convenio',
  'médico': 'medico', 'medico': 'medico',
  'cliente': 'cliente',
  'procedimento': 'procedimento', 'proc': 'procedimento',
  'instrumentadores': 'instrumentadores', 'instrumentador': 'instrumentadores',
  'vendedor': 'vendedor',
  'autorizada': 'autorizada', 'autorizado': 'autorizada',
  'status': 'status',
}

export function detectColumn(header: string): keyof AgendaItem | 'skip' {
  const h = header.toLowerCase().trim()
  for (const [key, field] of Object.entries(COL_MAP)) {
    if (h.includes(key)) return field
  }
  return 'skip'
}
