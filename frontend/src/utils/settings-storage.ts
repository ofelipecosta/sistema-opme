const KEY = 'opme_system_settings'

export interface WhatsAppSettings {
  enabled: boolean
  mode: 'link' | 'api'           // 'link' = wa.me (grátis), 'api' = WhatsApp Business API
  defaultPhone: string            // número padrão para envio direto
  apiUrl: string                  // URL do endpoint para modo 'api'
  apiToken: string                // Bearer token para modo 'api'
}

export interface EmailSettings {
  enabled: boolean
  mode: 'mailto' | 'smtp'        // 'mailto' = abre cliente de email, 'smtp' = envia via API
  defaultTo: string               // email padrão de destino
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
  smtpFromName: string
  smtpTls: boolean
  smtpApiUrl: string              // URL do backend SMTP proxy (se houver)
}

export interface TVSettings {
  autoSend: boolean               // ao enviar agendamento, aparecer na TV automaticamente
}

export interface SystemSettings {
  whatsapp: WhatsAppSettings
  email: EmailSettings
  tv: TVSettings
}

export const DEFAULT_SETTINGS: SystemSettings = {
  whatsapp: {
    enabled: true,
    mode: 'link',
    defaultPhone: '',
    apiUrl: '',
    apiToken: '',
  },
  email: {
    enabled: true,
    mode: 'mailto',
    defaultTo: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    smtpFromName: 'Sistema OPME NOS',
    smtpTls: true,
    smtpApiUrl: '',
  },
  tv: {
    autoSend: true,
  },
}

export function loadSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: SystemSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}
