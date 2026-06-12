/**
 * EmailJS configuration
 * ─────────────────────────────────────────────────────
 * 1. Crie sua conta em https://www.emailjs.com
 * 2. Adicione um serviço de e-mail (Gmail, Outlook, etc.)
 * 3. Crie os templates abaixo no painel do EmailJS
 * 4. Cole os IDs aqui
 */

export const EMAIL_CONFIG = {
  /** Chave pública — em Account > API Keys */
  PUBLIC_KEY: 'SUA_PUBLIC_KEY_AQUI',

  /** ID do serviço de e-mail conectado (ex: Gmail) */
  SERVICE_ID: 'SEU_SERVICE_ID_AQUI',

  /**
   * IDs dos templates.
   * Crie um template para cada evento no painel do EmailJS.
   * Veja os campos esperados em cada template em email-service.ts
   */
  TEMPLATES: {
    /** Disparado quando uma nova requisição é criada */
    NOVA_REQUISICAO: 'template_nova_req',

    /** Disparado quando o status de uma requisição muda */
    STATUS_ATUALIZADO: 'template_status',

    /** Disparado quando a separação de materiais é confirmada */
    SEPARACAO_CONFIRMADA: 'template_separacao',
  },
}

/** Lista de e-mails que sempre recebem cópia de qualquer evento */
export const EMAIL_ADMINS: string[] = [
  // 'admin@suaempresa.com.br',
]
