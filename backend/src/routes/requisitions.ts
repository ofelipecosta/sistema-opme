import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()
router.use(authenticate)

function generateNumber(count: number) {
  return `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const where = req.user?.perfil !== 'admin' ? { solicitanteId: req.user?.id } : {}
    const items = await prisma.requisition.findMany({
      where,
      include: { materiais: true, anexos: true, auditoria: true, solicitante: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(items)
  } catch { res.status(500).json({ error: 'Erro ao buscar requisições' }) }
})

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const item = await prisma.requisition.findUnique({
      where: { id: req.params.id },
      include: { materiais: true, anexos: true, auditoria: { include: { usuario: { select: { nome: true } } } }, solicitante: { select: { id: true, nome: true } } }
    })
    if (!item) return res.status(404).json({ error: 'Não encontrado' })
    if (req.user?.perfil !== 'admin' && item.solicitanteId !== req.user?.id) {
      return res.status(403).json({ error: 'Sem permissão' })
    }
    res.json(item)
  } catch { res.status(500).json({ error: 'Erro ao buscar requisição' }) }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { materiais, ...data } = req.body
    const count = await prisma.requisition.count()
    const item = await prisma.requisition.create({
      data: {
        ...data,
        numero: generateNumber(count),
        solicitanteId: req.user!.id,
        materiais: materiais ? { create: materiais } : undefined,
        auditoria: {
          create: {
            usuarioId: req.user!.id,
            acao: 'Criação',
            detalhes: 'Requisição criada',
            ip: req.ip,
          }
        }
      },
      include: { materiais: true, auditoria: true }
    })
    res.status(201).json(item)
  } catch (e) { res.status(500).json({ error: 'Erro ao criar requisição' }) }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.requisition.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Não encontrado' })
    if (req.user?.perfil !== 'admin' && existing.solicitanteId !== req.user?.id) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    const { materiais, auditoria, ...data } = req.body
    const item = await prisma.requisition.update({
      where: { id: req.params.id },
      data: {
        ...data,
        materiais: materiais ? {
          deleteMany: {},
          create: materiais
        } : undefined,
        auditoria: {
          create: {
            usuarioId: req.user!.id,
            acao: data.status ? `Status: ${data.status}` : 'Atualização',
            detalhes: 'Requisição atualizada',
            ip: req.ip,
          }
        }
      },
      include: { materiais: true, auditoria: true }
    })
    res.json(item)
  } catch { res.status(500).json({ error: 'Erro ao atualizar' }) }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.requisition.delete({ where: { id: req.params.id } })
    res.json({ message: 'Excluído' })
  } catch { res.status(500).json({ error: 'Erro ao excluir' }) }
})

export default router
