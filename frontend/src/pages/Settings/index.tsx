import { useState } from 'react'
import {
  MessageCircle, Mail, Tv2, Save, Eye, EyeOff,
  Wifi, Globe, Lock, Server, Info, CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../utils/settings-storage'
import type { SystemSettings } from '../../utils/settings-storage'

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-primary-600">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(loadSettings)
  const [showToken, setShowToken] = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof SystemSettings>(section: K, patch: Partial<SystemSettings[K]>) {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], ...patch } }))
    setSaved(false)
  }

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    toast.success('Configurações salvas!')
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() {
    if (!confirm('Restaurar todas as configurações para o padrão?')) return
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
    toast.success('Configurações restauradas')
  }

  return (
    <div className="max-w-2xl space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Configurações</h2>
          <p className="text-sm text-slate-400 mt-0.5">Integrações de envio e preferências do sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary btn-sm">Restaurar padrão</button>
          <button onClick={handleSave} className={`btn-sm flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-teal-600 text-white' : 'btn-primary'}`}>
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Salvo</> : <><Save className="w-4 h-4" /> Salvar</>}
          </button>
        </div>
      </div>

      {/* ── WhatsApp ── */}
      <div className="card p-6">
        <SectionTitle
          icon={<MessageCircle className="w-4 h-4" />}
          title="WhatsApp"
          description="Configure como os agendamentos são enviados via WhatsApp"
        />

        <div className="space-y-4">
          <Toggle
            checked={settings.whatsapp.enabled}
            onChange={v => update('whatsapp', { enabled: v })}
            label="Habilitar envio por WhatsApp"
          />

          {settings.whatsapp.enabled && (
            <>
              <Field label="Modo de envio">
                <div className="flex gap-3">
                  {(['link', 'api'] as const).map(m => (
                    <label key={m} className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${settings.whatsapp.mode === m ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" className="accent-primary-600" checked={settings.whatsapp.mode === m} onChange={() => update('whatsapp', { mode: m })} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{m === 'link' ? 'Link wa.me' : 'Business API'}</p>
                        <p className="text-xs text-slate-400">{m === 'link' ? 'Abre o WhatsApp com a mensagem' : 'Envia via servidor (automático)'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Telefone padrão" hint="DDD + número. Ex: 5521999998888. Deixe vazio para abrir sem destinatário.">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">+</span>
                  <input className="input" value={settings.whatsapp.defaultPhone} onChange={e => update('whatsapp', { defaultPhone: e.target.value })} placeholder="5521999998888" />
                </div>
              </Field>

              {settings.whatsapp.mode === 'api' && (
                <>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">O modo Business API requer um servidor backend que receba a requisição e envie via WhatsApp Business. Configure a URL do seu servidor abaixo.</p>
                  </div>
                  <Field label="URL do servidor" hint="Endpoint POST que recebe { phone, message }">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <input className="input" value={settings.whatsapp.apiUrl} onChange={e => update('whatsapp', { apiUrl: e.target.value })} placeholder="https://seu-servidor.com/api/whatsapp/send" />
                    </div>
                  </Field>
                  <Field label="Token de autenticação">
                    <div className="relative">
                      <input className="input pr-10" type={showToken ? 'text' : 'password'} value={settings.whatsapp.apiToken} onChange={e => update('whatsapp', { apiToken: e.target.value })} placeholder="Bearer token..." />
                      <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── E-mail ── */}
      <div className="card p-6">
        <SectionTitle
          icon={<Mail className="w-4 h-4" />}
          title="E-mail"
          description="Configure o envio de notificações por e-mail"
        />

        <div className="space-y-4">
          <Toggle
            checked={settings.email.enabled}
            onChange={v => update('email', { enabled: v })}
            label="Habilitar envio por e-mail"
          />

          {settings.email.enabled && (
            <>
              <Field label="Modo de envio">
                <div className="flex gap-3">
                  {(['mailto', 'smtp'] as const).map(m => (
                    <label key={m} className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${settings.email.mode === m ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" className="accent-primary-600" checked={settings.email.mode === m} onChange={() => update('email', { mode: m })} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{m === 'mailto' ? 'Cliente local' : 'SMTP / API'}</p>
                        <p className="text-xs text-slate-400">{m === 'mailto' ? 'Abre o app de e-mail do dispositivo' : 'Envia direto via servidor'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="E-mail de destino padrão" hint="Para quem os agendamentos são enviados">
                <input className="input" type="email" value={settings.email.defaultTo} onChange={e => update('email', { defaultTo: e.target.value })} placeholder="operacional@empresa.com.br" />
              </Field>

              {settings.email.mode === 'smtp' && (
                <>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex gap-2.5">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">Configure um servidor backend em <code className="bg-blue-100 px-1 rounded">/api/email/send</code> que receba a requisição e envie via SMTP, ou informe abaixo os parâmetros para um proxy existente.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Servidor SMTP (host)">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input className="input" value={settings.email.smtpHost} onChange={e => update('email', { smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
                      </div>
                    </Field>
                    <Field label="Porta">
                      <input className="input" type="number" value={settings.email.smtpPort} onChange={e => update('email', { smtpPort: Number(e.target.value) })} placeholder="587" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Usuário SMTP">
                      <input className="input" value={settings.email.smtpUser} onChange={e => update('email', { smtpUser: e.target.value })} placeholder="usuario@gmail.com" />
                    </Field>
                    <Field label="Senha SMTP">
                      <div className="relative">
                        <input className="input pr-10" type={showSmtpPass ? 'text' : 'password'} value={settings.email.smtpPassword} onChange={e => update('email', { smtpPassword: e.target.value })} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowSmtpPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="E-mail remetente (from)">
                      <input className="input" value={settings.email.smtpFrom} onChange={e => update('email', { smtpFrom: e.target.value })} placeholder="noreply@empresa.com.br" />
                    </Field>
                    <Field label="Nome remetente">
                      <input className="input" value={settings.email.smtpFromName} onChange={e => update('email', { smtpFromName: e.target.value })} placeholder="Sistema OPME NOS" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="URL do proxy SMTP" hint="Endpoint POST que recebe { to, subject, text, from, fromName }">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input className="input" value={settings.email.smtpApiUrl} onChange={e => update('email', { smtpApiUrl: e.target.value })} placeholder="https://seu-servidor.com/api/email/send" />
                      </div>
                    </Field>
                    <Field label="TLS/SSL">
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-primary-600 rounded" checked={settings.email.smtpTls} onChange={e => update('email', { smtpTls: e.target.checked })} />
                        <span className="text-sm text-slate-600 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Conexão segura (TLS)</span>
                      </label>
                    </Field>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── TV ── */}
      <div className="card p-6">
        <SectionTitle
          icon={<Tv2 className="w-4 h-4" />}
          title="Painel TV"
          description="Comportamento do painel de acompanhamento em TV"
        />
        <Toggle
          checked={settings.tv.autoSend}
          onChange={v => update('tv', { autoSend: v })}
          label="Mostrar agendamentos enviados automaticamente no painel TV"
        />
      </div>

      {/* Footer save */}
      <div className="flex justify-end pb-8">
        <button onClick={handleSave} className={`btn-sm flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-teal-600 text-white' : 'btn-primary'}`}>
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Configurações salvas</> : <><Save className="w-4 h-4" /> Salvar configurações</>}
        </button>
      </div>
    </div>
  )
}
