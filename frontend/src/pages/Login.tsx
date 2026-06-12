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

      {/* ── Painel esquerdo — desktop ── */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[55%] flex-col justify-between p-10 lg:p-16"
        style={{ background: 'linear-gradient(135deg, #7a1010 0%, #a01818 60%, #c02020 100%)' }}
      >
        <div>
          <img
            src="/logo-nos.png"
            alt="Grupo NOS"
            className="h-16 lg:h-20 object-contain brightness-0 invert"
          />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Sistema de<br />Agendamento
          </h1>
          <p className="text-red-100 text-lg leading-relaxed max-w-md">
            Controle completo de requisições cirúrgicas, agenda e separação de materiais OPME.
          </p>
        </div>
        <p className="text-red-300 text-sm">© {new Date().getFullYear()} Grupo NOS. Todos os direitos reservados.</p>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex flex-col bg-gray-50" style={{ minHeight: '100dvh' }}>

        {/* Hero mobile — visível só em telas pequenas */}
        <div
          className="md:hidden flex flex-col items-center justify-end pb-10 pt-16 px-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #6a0d0d 0%, #a01818 50%, #c02020 100%)',
            minHeight: '280px',
          }}
        >
          {/* Círculos decorativos */}
          <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full opacity-10"
            style={{ background: 'white' }} />
          <div className="absolute top-[20px] right-[30px] w-24 h-24 rounded-full opacity-10"
            style={{ background: 'white' }} />
          <div className="absolute bottom-[-30px] left-[-30px] w-32 h-32 rounded-full opacity-10"
            style={{ background: 'white' }} />

          {/* Logo */}
          <img
            src="/logo-nos.png"
            alt="Grupo NOS"
            className="h-16 object-contain brightness-0 invert mb-6 relative z-10"
          />

          {/* Textos */}
          <div className="text-center relative z-10">
            <h1 className="text-3xl font-bold text-white leading-tight">
              Sistema de<br />Agendamento
            </h1>
            <p className="text-red-200 text-sm mt-2">
              Controle cirúrgico e materiais OPME
            </p>
          </div>
        </div>

        {/* Card do formulário */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-0">
          <div className="w-full max-w-sm">

            {/* Título desktop */}
            <div className="mb-7 hidden md:block">
              <h2 className="text-2xl font-bold text-gray-800">Bem-vindo</h2>
              <p className="text-gray-400 text-sm mt-1">Entre com suas credenciais para continuar</p>
            </div>

            {/* Título mobile (abaixo do hero) */}
            <div className="mb-6 md:hidden text-center">
              <h2 className="text-xl font-bold text-gray-800">Faça seu login</h2>
              <p className="text-gray-400 text-sm mt-1">Entre com suas credenciais</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md px-6 py-8 md:px-10 md:py-10">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Login */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Login</label>
                  <input
                    className="w-full px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent
                               transition-all appearance-none"
                    style={{ fontSize: '16px', height: '52px' }}
                    placeholder="Seu login de acesso"
                    value={loginVal}
                    onChange={e => setLoginVal(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Senha</label>
                  <div className="relative">
                    <input
                      className="w-full px-4 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-800
                                 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent
                                 transition-all appearance-none"
                      style={{ fontSize: '16px', height: '52px' }}
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Sua senha"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      autoComplete="current-password"
                      enterKeyHint="done"
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-4 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowSenha(!showSenha)}
                      tabIndex={-1}
                      aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Botão entrar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl text-white font-bold text-base
                             flex items-center justify-center gap-2 transition-all
                             active:scale-[0.97] disabled:opacity-70 mt-2"
                  style={{
                    height: '52px',
                    background: loading ? '#c05050' : 'linear-gradient(135deg, #7a1010, #c02020)',
                  }}
                >
                  {loading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Entrar'}
                </button>

              </form>

              <p className="text-center text-xs text-gray-300 mt-8">Sistema OPME — Grupo NOS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
