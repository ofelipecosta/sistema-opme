import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getUsers, createUser, updateUser } from '../../utils/storage'
import type { User, UserRole } from '../../types'

type FormValues = Omit<User, 'id' | 'createdAt' | 'updatedAt'>

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'admin',          label: 'Administrador',  desc: 'Acesso total — configurações, usuários, relatórios' },
  { value: 'gestor',         label: 'Gestor',          desc: 'Gestão completa — sem configurações do sistema' },
  { value: 'estoque',        label: 'Estoque',         desc: 'Separação de materiais apenas' },
  { value: 'vendedor',       label: 'Vendedor',        desc: 'Cria e gerencia as próprias requisições' },
  { value: 'instrumentador', label: 'Instrumentador',  desc: 'Visualiza apenas as cirurgias em que é escalado' },
]

export default function UserForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { perfil: 'vendedor', status: 'ativo' }
  })

  useEffect(() => {
    if (isEdit && id) {
      getUsers().then(users => {
        const u = users.find(u => u.id === id)
        if (u) reset(u)
      })
    }
  }, [id, isEdit, reset])

  async function onSubmit(data: FormValues) {
    try {
      if (isEdit && id) {
        await updateUser(id, data)
        toast.success('Usuário atualizado!')
      } else {
        const users = await getUsers()
        if (users.find(u => u.login === data.login)) {
          toast.error('Login já existe!'); return
        }
        await createUser(data)
        toast.success('Usuário criado!')
      }
      navigate('/usuarios')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao salvar usuário')
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/usuarios')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="form-grid">
          <div className="sm:col-span-2">
            <label className="label">Nome Completo *</label>
            <input className={`input ${errors.nome ? 'input-error' : ''}`} {...register('nome', { required: true })} placeholder="Nome completo" />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input className={`input ${errors.email ? 'input-error' : ''}`} {...register('email', { required: true })} type="email" placeholder="email@nos.com.br" />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" {...register('telefone')} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className="label">Cargo/Função</label>
            <input className="input" {...register('cargo')} placeholder="Ex: Vendedor Regional" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input className="input" {...register('empresa')} placeholder="NOS" />
          </div>
        </div>

        <div className="border-t pt-4 form-grid">
          <div>
            <label className="label">Login *</label>
            <input className={`input ${errors.login ? 'input-error' : ''}`} {...register('login', { required: true })} placeholder="login.usuario" autoCapitalize="none" />
          </div>
          <div>
            <label className="label">Senha {isEdit ? '(deixe em branco para manter)' : '*'}</label>
            <input
              className={`input ${!isEdit && errors.senha ? 'input-error' : ''}`}
              type="password"
              {...register('senha', { required: !isEdit })}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Perfil de Acesso *</label>
            <select className="input" {...register('perfil', { required: true })}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/usuarios')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary ml-auto">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </div>
  )
}
