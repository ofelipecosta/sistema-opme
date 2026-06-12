import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
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
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* Painel esquerdo — marca */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[55%] flex-col justify-between p-10 lg:p-16"
        style={{ background: 'linear-gradient(135deg, #7a1010 0%, #a01818 60%, #c02020 100%)' }}
      >
        {/* Logo */}
        <div>
          <img
            src="/logo-nos.png"
            alt="Grupo NOS"
            className="h-16 lg:h-20 object-contain brightness-0 invert"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Texto central */}
        <div className="space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Sistema de<br />Gestão OPME
          </h1>
          <p className="text-red-100 text-lg leading-relaxed max-w-md">
            Controle completo de requisições cirúrgicas, agenda e separação de materiais OPME.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-white text-2xl font-bold">100%</p>
              <p className="text-red-200 text-sm">Digital</p>
            </div>
            <div className="w-px bg-red-400/40" />
            <div>
              <p className="text-white text-2xl font-bold">Tempo</p>
              <p className="text-red-200 text-sm">Real</p>
            </div>
            <div className="w-px bg-red-400/40" />
            <div>
              <p className="text-white text-2xl font-bold">Seguro</p>
              <p className="text-red-200 text-sm">e Confiável</p>
            </div>
          </div>
        </div>

        <p className="text-red-300 text-sm">© {new Date().getFullYear()} Grupo NOS. Todos os direitos reservados.</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen md:min-h-0">

        {/* Logo mobile */}
        <div className="mb-8 md:hidden text-center">
          <img
            src="/logo-nos.png"
            alt="Grupo NOS"
            className="h-14 mx-auto object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8 lg:p-10">

          {/* Cabeçalho do card */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Bem-vindo</h2>
            <p className="text-gray-400 text-sm mt-1">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Login */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Login
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm
                           focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#a01818' } as React.CSSProperties}
                placeholder="Seu login de acesso"
                value={loginVal}
                onChange={e => setLoginVal(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm
                             focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#a01818' } as React.CSSProperties}
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowSenha(!showSenha)}
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm
                         flex items-center justify-center gap-2 transition-all
                         active:scale-[0.98] disabled:opacity-70 mt-2"
              style={{ background: loading ? '#c05050' : 'linear-gradient(135deg, #7a1010, #c02020)' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>

          </form>

          <p className="text-center text-xs text-gray-300 mt-8">
            Sistema OPME — Grupo NOS
          </p>
        </div>
      </div>
    </div>
  )
}
