import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()
router.use(authenticate, requireAdmin)

router.get('/dashboard', async (_req, res) => {
  try {
    const [total, eletivas, emergencias, statusDist, hospitaisVolume] = await Promise.all([
      prisma.requisition.count(),
      prisma.requisition.count({ where: { tipoCirurgia: 'eletiva' } }),
      prisma.requisition.count({ where: { tipoCirurgia: 'emergencia' } }),
      prisma.requisition.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.requisition.groupBy({ by: ['hospitalNome'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    ])

    const pendentes = await prisma.requisition.count({
      where: { status: { notIn: ['finalizada', 'cancelada'] } }
    })
    const finalizadas = await prisma.requisition.count({ where: { status: 'finalizada' } })

    res.json({
      total, eletivas, emergencias, pendentes, finalizadas,
      statusDistribuicao: statusDist.map(s => ({ status: s.status, total: s._count.id })),
      hospitaisVolume: hospitaisVolume.map(h => ({ nome: h.hospitalNome, total: h._count.id })),
    })
  } catch { res.status(500).json({ error: 'Erro ao gerar relatório' }) }
})

export default router
