export interface Permissions {
  nav: {
    dashboard:        boolean
    agendamento:      boolean
    separacao:        boolean
    controle:         boolean
    relatorios:       boolean
    cadastros:        boolean
    instrumentadores: boolean
    usuarios:         boolean
    configuracoes:    boolean
    importar:         boolean
  }
  canCreateRequisition:     boolean
  canEditOwnRequisition:    boolean
  canEditAllRequisitions:   boolean
  canDeleteRequisition:     boolean
  canAdvanceStatus:         boolean
  seeOnlyOwnAgenda:              boolean
  seeOnlyAssignedInstrumentador: boolean
  isAdmin:  boolean
  isGestor: boolean
  landingPath: string
}

const PERMS: Record<string, Permissions> = {
  admin: {
    nav: { dashboard:true, agendamento:true, separacao:true, controle:true, relatorios:true, cadastros:true, instrumentadores:true, usuarios:true, configuracoes:true, importar:true },
    canCreateRequisition:     true,
    canEditOwnRequisition:    true,
    canEditAllRequisitions:   true,
    canDeleteRequisition:     true,
    canAdvanceStatus:         true,
    seeOnlyOwnAgenda:              false,
    seeOnlyAssignedInstrumentador: false,
    isAdmin:  true,
    isGestor: false,
    landingPath: '/',
  },
  gestor: {
    nav: { dashboard:true, agendamento:true, separacao:true, controle:true, relatorios:true, cadastros:true, instrumentadores:true, usuarios:false, configuracoes:false, importar:false },
    canCreateRequisition:     true,
    canEditOwnRequisition:    true,
    canEditAllRequisitions:   true,
    canDeleteRequisition:     false,
    canAdvanceStatus:         true,
    seeOnlyOwnAgenda:              false,
    seeOnlyAssignedInstrumentador: false,
    isAdmin:  false,
    isGestor: true,
    landingPath: '/',
  },
  estoque: {
    nav: { dashboard:true, agendamento:false, separacao:true, controle:false, relatorios:false, cadastros:false, instrumentadores:false, usuarios:false, configuracoes:false, importar:false },
    canCreateRequisition:     false,
    canEditOwnRequisition:    false,
    canEditAllRequisitions:   false,
    canDeleteRequisition:     false,
    canAdvanceStatus:         true,
    seeOnlyOwnAgenda:              false,
    seeOnlyAssignedInstrumentador: false,
    isAdmin:  false,
    isGestor: false,
    landingPath: '/separacao',
  },
  vendedor: {
    nav: { dashboard:false, agendamento:true, separacao:false, controle:false, relatorios:false, cadastros:false, instrumentadores:false, usuarios:false, configuracoes:false, importar:false },
    canCreateRequisition:     true,
    canEditOwnRequisition:    true,
    canEditAllRequisitions:   false,
    canDeleteRequisition:     false,
    canAdvanceStatus:         false,
    seeOnlyOwnAgenda:              true,
    seeOnlyAssignedInstrumentador: false,
    isAdmin:  false,
    isGestor: false,
    landingPath: '/requisicoes/nova',
  },
  instrumentador: {
    nav: { dashboard:false, agendamento:true, separacao:false, controle:false, relatorios:false, cadastros:false, instrumentadores:false, usuarios:false, configuracoes:false, importar:false },
    canCreateRequisition:     false,
    canEditOwnRequisition:    false,
    canEditAllRequisitions:   false,
    canDeleteRequisition:     false,
    canAdvanceStatus:         false,
    seeOnlyOwnAgenda:              false,
    seeOnlyAssignedInstrumentador: true,
    isAdmin:  false,
    isGestor: false,
    landingPath: '/requisicoes',
  },
  // Legacy — mantém funcionando
  operacional: {
    nav: { dashboard:true, agendamento:true, separacao:true, controle:false, relatorios:false, cadastros:false, instrumentadores:false, usuarios:false, configuracoes:false, importar:false },
    canCreateRequisition:     true,
    canEditOwnRequisition:    true,
    canEditAllRequisitions:   false,
    canDeleteRequisition:     false,
    canAdvanceStatus:         true,
    seeOnlyOwnAgenda:              false,
    seeOnlyAssignedInstrumentador: false,
    isAdmin:  false,
    isGestor: false,
    landingPath: '/',
  },
  consulta: {
    nav: { dashboard:true, agendamento:true, separacao:false, controle:false, relatorios:false, cadastros:false, instrumentadores:false, usuarios:false, configuracoes:false, importar:false },
    canCreateRequisition:     false,
    canEditOwnRequisition:    false,
    canEditAllRequisitions:   false,
    canDeleteRequisition:     false,
    canAdvanceStatus:         false,
    seeOnlyOwnAgenda:              false,
    seeOnlyAssignedInstrumentador: false,
    isAdmin:  false,
    isGestor: false,
    landingPath: '/',
  },
}

export function getPermissions(role: string): Permissions {
  return PERMS[role] ?? PERMS.vendedor
}
