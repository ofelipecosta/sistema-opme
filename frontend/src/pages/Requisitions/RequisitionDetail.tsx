import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Edit2, ArrowLeft, AlertTriangle, User, Building2, Stethoscope,
  Package, ClipboardList, History, ChevronRight, Download, CheckCircle2, XCircle,
  MessageCircle, Mail, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getRequisitionById, updateRequisition, deleteRequisition } from '../../utils/storage'
import { statusLabel, statusColor, surgeryTypeLabel, formatDate, formatDateTime, getStatusFlow } from '../../utils/helpers'
import { shareWhatsApp, shareEmail } from '../../utils/share'
import { emailStatusAtualizado } from '../../utils/email-service'
import { useAuth } from '../../contexts/AuthContext'
import type { RequisitionStatus } from '../../types'

const STATUS_FLOW_LABELS: Record<RequisitionStatus, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', em_analise: 'Em Análise', aprovada: 'Aprovada',
  separacao_material: 'Separação', material_enviado: 'Enviado', finalizada: 'Finalizada', cancelada: 'Cancelada',
}

export default function RequisitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin, canEdit } = useAuth()
  const [req, setReq] = useState<import('../../types').Requisition | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    setLoading(true)
    setReq(await getRequisitionById(id))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!req) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Requisição não encontrada</p>
        <button onClick={() => navigate('/requisicoes')} className="btn-primary mt-4">Voltar</button>
      </div>
    )
  }

  async function advanceStatus(newStatus: RequisitionStatus) {
    if (!user || !req) return
    await updateRequisition(req.id, { status: newStatus }, user, `Status alterado para: ${statusLabel(newStatus)}`)
    toast.success(`Status: ${statusLabel(newStatus)}`)
    const destinos: string[] = []
    if (req.vendedorEmail) destinos.push(req.vendedorEmail)
    if ((req as any).solicitanteEmail) destinos.push((req as any).solicitanteEmail)
    emailStatusAtualizado(req, statusLabel(newStatus), user.nome, '', destinos)
    load()
  }

  async function cancelReq() {
    if (!user || !req) return
    if (!confirm('Confirmar cancelamento desta requisição?')) return
    await updateRequisition(req.id, { status: 'cancelada' }, user, 'Cancelamento')
    toast.success('Requisição cancelada')
    const destinos: string[] = []
    if (req.vendedorEmail) destinos.push(req.vendedorEmail)
    if ((req as any).solicitanteEmail) destinos.push((req as any).solicitanteEmail)
    emailStatusAtualizado(req, 'Cancelada', user.nome, 'Requisição cancelada pelo administrador', destinos)
    load()
  }

  async function deleteReq() {
    if (!user || !req) return
    if (!confirm(`Excluir a requisição ${req.numero}?\n\nEssa ação gera um log de auditoria e não pode ser desfeita.`)) return
    await deleteRequisition(req.id, user)
    toast.success('Requisição excluída — log registrado')
    navigate('/requisicoes')
  }

  const nextStatuses = getStatusFlow(req.status)
  const canChangeStatus = isAdmin || (canEdit && req.solicitanteId === user?.id)
  const canEditReq = canEdit && (isAdmin || req.solicitanteId === user?.id) && ['rascunho', 'enviada'].includes(req.status)
  const canDelete = isAdmin || (canEdit && req.solicitanteId === user?.id)

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/requisicoes')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-gray-500">{req.numero}</span>
            {req.tipoCirurgia === 'emergencia' && (
              <span className="badge bg-red-100 text-red-700 emergency-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" /> EMERGÊNCIA
              </span>
            )}
            <span className={`badge ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mt-1 truncate">
            {req.pacienteNome || 'Paciente não informado'}
          </h1>
          <p className="text-sm text-gray-500">{req.hospitalNome} — {req.medicoNome}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {canEditReq && (
            <button onClick={() => navigate(`/requisicoes/${req.id}/editar`)} className="btn-secondary btn-sm">
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          )}
          <button
            onClick={() => shareWhatsApp(req)}
            className="btn-sm bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
            title="Enviar via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={() => shareEmail(req)}
            className="btn-secondary btn-sm"
            title="Enviar por E-mail"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">E-mail</span>
          </button>
          <button onClick={() => window.print()} className="btn-secondary btn-sm no-print">
            <Download className="w-4 h-4" />
          </button>
          {canDelete && (
            <button onClick={deleteReq} className="btn-danger btn-sm" title="Excluir requisição">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status flow */}
      {canChangeStatus && req.status !== 'finalizada' && req.status !== 'cancelada' && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Avançar Status</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(s => (
              <button key={s} onClick={() => advanceStatus(s)} className="btn-success btn-sm">
                <ChevronRight className="w-3.5 h-3.5" />
                {STATUS_FLOW_LABELS[s]}
              </button>
            ))}
            {req.status !== 'cancelada' && (
              <button onClick={cancelReq} className="btn-danger btn-sm">
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Surgery info */}
        <InfoCard icon={<Stethoscope className="w-4 h-4" />} title="Dados da Cirurgia">
          <Row label="Procedimento" value={req.cirurgiaProcedimento} />
          <Row label="Data" value={req.cirurgiaData ? `${formatDate(req.cirurgiaData)} ${req.cirurgiaHorario}` : '-'} />
          <Row label="Convênio" value={req.cirurgiaConvenio} />
          <Row label="Código TUSS" value={req.cirurgiaCodTUSS} />
          <Row label="Sala" value={req.cirurgiaSala} />
          <Row label="Tipo" value={surgeryTypeLabel(req.tipoCirurgia)} highlight={req.tipoCirurgia === 'emergencia'} />
        </InfoCard>

        {/* Hospital */}
        <InfoCard icon={<Building2 className="w-4 h-4" />} title="Hospital">
          <Row label="Nome" value={req.hospitalNome} />
          <Row label="Cidade/Estado" value={[req.hospitalCidade, req.hospitalEstado].filter(Boolean).join(' — ')} />
          <Row label="Setor" value={req.hospitalSetor} />
          <Row label="Centro Cirúrgico" value={req.hospitalCentroCirurgico} />
          <Row label="Contato" value={req.hospitalContato} />
        </InfoCard>

        {/* Patient */}
        <InfoCard icon={<User className="w-4 h-4" />} title="Paciente">
          <Row label="Nome" value={req.pacienteNome} />
          <Row label="Nascimento" value={req.pacienteDataNascimento ? formatDate(req.pacienteDataNascimento) : '-'} />
          <Row label="Sexo" value={req.pacienteSexo === 'M' ? 'Masculino' : req.pacienteSexo === 'F' ? 'Feminino' : req.pacienteSexo} />
          <Row label="Prontuário" value={req.pacienteProntuario} />
        </InfoCard>

        {/* Doctor + instrumentador */}
        <InfoCard icon={<Stethoscope className="w-4 h-4" />} title="Médico e Instrumentador">
          <Row label="Médico" value={req.medicoNome} />
          <Row label="Especialidade" value={req.medicoEspecialidade} />
          <Row label="CRM" value={req.medicoCRM} />
          <div className="border-t border-gray-100 my-2" />
          <Row label="Instrumentador" value={req.instrumentadorNome} />
          <Row label="Telefone" value={req.instrumentadorTelefone} />
          <Row label="Empresa" value={req.instrumentadorEmpresa} />
        </InfoCard>
      </div>

      {/* Vendedor */}
      <InfoCard icon={<User className="w-4 h-4" />} title="Vendedor Responsável">
        <div className="grid grid-cols-3 gap-2">
          <Row label="Nome" value={req.vendedorNome} />
          <Row label="Telefone" value={req.vendedorTelefone} />
          <Row label="E-mail" value={req.vendedorEmail} />
        </div>
      </InfoCard>

      {/* Materials */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
          <Package className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-gray-700">Materiais OPME</h3>
          <span className="ml-auto text-xs text-gray-500 font-medium">{req.materiais.length} {req.materiais.length === 1 ? 'item' : 'itens'}</span>
        </div>
        {req.materiais.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nenhum material registrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Código</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Descrição</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Fabricante</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Qtd</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Un.</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {req.materiais.map((m, i) => (
                  <tr key={m.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{m.codigo || '-'}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{m.descricao}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">{m.fabricante || '-'}</td>
                    <td className="px-4 py-2 text-center font-bold text-primary-700">{m.quantidade}</td>
                    <td className="px-4 py-2 text-center text-gray-600 text-xs">{m.unidade}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs max-w-[160px] truncate">{m.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Observações */}
      {req.observacoesGerais && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-primary-600" /> Observações Gerais
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{req.observacoesGerais}</p>
        </div>
      )}

      {/* Audit log */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
          <History className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-gray-700">Histórico de Auditoria</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {req.auditoria.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{log.acao}</span>
                  <span className="text-xs text-gray-500">por {log.usuarioNome}</span>
                </div>
                <p className="text-xs text-gray-500">{log.detalhes}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-400 text-right pb-8">
        Criado: {formatDateTime(req.createdAt)} | Atualizado: {formatDateTime(req.updatedAt)} | Solicitante: {req.solicitanteNome}
      </div>
    </div>
  )
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-primary-600">{icon}</span>
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-0.5">{label}:</span>
      <span className={`text-sm font-medium flex-1 ${highlight ? 'text-red-700' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}
