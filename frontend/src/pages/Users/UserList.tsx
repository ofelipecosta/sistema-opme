import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, UserCheck, UserX, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getUsers, updateUser, deleteUser } from '../../utils/storage'
import { roleLabel, roleColor } from '../../utils/helpers'
import type { User } from '../../types'

export default function UserList() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setUsers(await getUsers())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.login.toLowerCase().includes(q) ||
      u.empresa.toLowerCase().includes(q)
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
    if (!confirm(`Remover o usuário "${nome}" permanentemente?\n\nEssa ação não pode ser desfeita.`)) return
    await deleteUser(id)
    toast.success('Usuário removido')
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => navigate('/usuarios/novo')} className="btn-primary">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Usuário</span>
        </button>
      </div>

      {/* Desktop table */}
      <div className="card hidden md:block overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Login</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Perfil</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(u => (
              <tr key={u.id} className={`hover:bg-slate-50/70 transition-colors ${u.status === 'inativo' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{u.nome}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.login}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                <td className="px-4 py-3"><span className={`badge ${roleColor(u.perfil)}`}>{roleLabel(u.perfil)}</span></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{u.empresa}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.status === 'ativo' ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'bg-slate-100 text-slate-500'}`}>
                    {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/usuarios/${u.id}/editar`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleStatus(u)}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${u.status === 'ativo' ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-green-600'}`}
                      title={u.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                      {u.status === 'ativo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(u.id, u.nome)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remover usuário">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">Nenhum usuário encontrado</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(u => (
          <div key={u.id} className={`card p-4 ${u.status === 'inativo' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{u.nome}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{u.login}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <span className={`badge ${roleColor(u.perfil)}`}>{roleLabel(u.perfil)}</span>
                <span className={`badge ${u.status === 'ativo' ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'bg-slate-100 text-slate-500'}`}>
                  {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/usuarios/${u.id}/editar`)} className="btn-secondary btn-sm flex-1">
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={() => toggleStatus(u)}
                className={`btn-sm flex-1 ${u.status === 'ativo' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5' : 'btn-success'}`}>
                {u.status === 'ativo'
                  ? <><UserX className="w-3.5 h-3.5" /> Desativar</>
                  : <><UserCheck className="w-3.5 h-3.5" /> Ativar</>}
              </button>
              <button onClick={() => handleDelete(u.id, u.nome)}
                className="btn-danger btn-sm px-3" title="Remover">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card p-8 text-center text-slate-400 text-sm">Nenhum usuário encontrado</div>
        )}
      </div>
    </div>
  )
}
