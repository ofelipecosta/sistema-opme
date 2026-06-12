import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Stethoscope, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const [loginVal, setLoginVal] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!loginVal || !senha) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    const ok = await login(loginVal.trim(), senha)
    setLoading(false)
    if (!ok) toast.error('Login ou senha inválidos')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-slate-900 p-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Sistema OPME</p>
            <p className="text-slate-400 text-xs mt-0.5">NOS</p>
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold text-white leading-snug">
            Gestão de<br />Materiais<br />Cirúrgicos
          </p>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            Controle completo de requisições OPME, agenda cirúrgica e logística de materiais.
          </p>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} NOS</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-none">Sistema OPME</p>
              <p className="text-slate-400 text-xs mt-0.5">NOS</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Bem-vindo</h2>
          <p className="text-slate-400 text-sm mb-8">Entre com suas credenciais para acessar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Login</label>
              <input
                className="input"
                placeholder="Seu login de acesso"
                value={loginVal}
                onChange={e => setLoginVal(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowSenha(!showSenha)}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 mt-2 text-sm" disabled={loading}>
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><ArrowRight className="w-4 h-4" /> Entrar</>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-card text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-2">Acesso de demonstração</p>
            <div className="space-y-1">
              <p>Admin: <code className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md font-mono">admin</code> / <code className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md font-mono">admin123</code></p>
              <p>Vendedor: <code className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md font-mono">joao.silva</code> / <code className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md font-mono">123456</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
