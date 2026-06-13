import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, UserCheck, UserX, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getUsers, updateUser, deleteUser } from '../../utils/storage'
import { roleLabel, roleColor } from '../../utils/helpers'
import { useTheme } from '../../contexts/ThemeContext'
import type { User } from '../../types'

function useT() {
  const { isDark } = useTheme()
  return {
    card:       isDark ? '#1F2937' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    text1:      isDark ? '#F3F4F6' : '#1D1D1F',
    text2:      isDark ? '#D1D5DB' : '#48484A',
    text3:      isDark ? '#9CA3AF' : '#6B7280',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    thead:      isDark ? '#111827' : '#F8FAFC',
    inputBg:    isDark ? '#374151' : '#ffffff',
  }
}

export default function UserList() {
  const navigate = useNavigate()
  const T = useT()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() { setLoading(true); setUsers(await getUsers()); setLoading(false) }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
      u.login.toLowerCase().includes(q) || u.empresa.toLowerCase().includes(q)
    )
  }, [users, search])

  async function toggleStatus(u: User) {
    try {
      await updateUser(u.id, { status: u.status === 'ativo' ? 'inativo' : 'ativo' })
      toast.success(`Usuário ${u.status === 'ativo' ? 'desativado' : 'ativado'}`)
      load()
    } catch { toast.error('Erro ao atualizar usuário') }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Remover o usuário "${nome}" permanentemente?`)) return
    await deleteUser(id); toast.success('Usuário removido'); load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.text3 }} />
          <input className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{ background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1 }}
            placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => navigate('/usuarios/novo')} className="btn-primary">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Usuário</span>
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: T.thead, borderBottom: `1px solid ${T.divider}` }}>
              {['Nome','Login','E-mail','Perfil','Empresa','Status','Ações'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${i === 6 ? 'text-right' : 'text-left'}`}
                  style={{ color: T.text3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${T.divider}`, opacity: u.status === 'inativo' ? 0.5 : 1 }}>
                <td className="px-4 py-3 font-semibold" style={{ color: T.text1 }}>{u.nome}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: T.text3 }}>{u.login}</td>
                <td className="px-4 py-3 text-xs" style={{ color: T.text2 }}>{u.email}</td>
                <td className="px-4 py-3"><span className={`badge ${roleColor(u.perfil)}`}>{roleLabel(u.perfil)}</span></td>
                <td className="px-4 py-3 text-xs" style={{ color: T.text2 }}>{u.empresa}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={u.status === 'ativo'
                      ? { background: 'rgba(52,199,89,0.12)', color: '#34C759' }
                      : { background: 'rgba(142,142,147,0.12)', color: '#8E8E93' }}>
                    {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/usuarios/${u.id}/editar`)}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: T.text3 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#007AFF')}
                      onMouseLeave={e => (e.currentTarget.style.color = T.text3)} title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleStatus(u)}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: T.text3 }}
                      onMouseEnter={e => (e.currentTarget.style.color = u.status === 'ativo' ? '#FF9500' : '#34C759')}
                      onMouseLeave={e => (e.currentTarget.style.color = T.text3)}
                      title={u.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                      {u.status === 'ativo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(u.id, u.nome)}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: T.text3 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#FF3B30')}
                      onMouseLeave={e => (e.currentTarget.style.color = T.text3)} title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: T.text3 }}>Nenhum usuário encontrado</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(u => (
          <div key={u.id} className="rounded-2xl p-4"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, opacity: u.status === 'inativo' ? 0.6 : 1 }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ color: T.text1 }}>{u.nome}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: T.text3 }}>{u.login}</p>
                <p className="text-xs truncate" style={{ color: T.text3 }}>{u.email}</p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <span className={`badge ${roleColor(u.perfil)}`}>{roleLabel(u.perfil)}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={u.status === 'ativo'
                    ? { background: 'rgba(52,199,89,0.12)', color: '#34C759' }
                    : { background: 'rgba(142,142,147,0.12)', color: '#8E8E93' }}>
                  {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/usuarios/${u.id}/editar`)}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF' }}>
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={() => toggleStatus(u)}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-medium"
                style={u.status === 'ativo'
                  ? { background: 'rgba(255,149,0,0.10)', color: '#FF9500' }
                  : { background: 'rgba(52,199,89,0.10)', color: '#34C759' }}>
                {u.status === 'ativo' ? <><UserX className="w-3.5 h-3.5" /> Desativar</> : <><UserCheck className="w-3.5 h-3.5" /> Ativar</>}
              </button>
              <button onClick={() => handleDelete(u.id, u.nome)}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl p-8 text-center text-sm"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, color: T.text3 }}>
            Nenhum usuário encontrado
          </div>
        )}
      </div>
    </div>
  )
}
