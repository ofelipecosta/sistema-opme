import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()
router.use(authenticate, requireAdmin)

router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, telefone: true, cargo: true, empresa: true, login: true, perfil: true, status: true, createdAt: true, updatedAt: true }
    })
    res.json(users)
  } catch { res.status(500).json({ error: 'Erro ao buscar usuários' }) }
})

router.post('/', async (req, res) => {
  try {
    const { senha, ...data } = req.body
    const hash = await bcrypt.hash(senha, 12)
    const user = await prisma.user.create({ data: { ...data, senha: hash } })
    const { senha: _, ...safe } = user
    res.status(201).json(safe)
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Login ou e-mail já cadastrado' })
    res.status(500).json({ error: 'Erro ao criar usuário' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { senha, ...data } = req.body
    const updateData: any = { ...data }
    if (senha) updateData.senha = await bcrypt.hash(senha, 12)
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData })
    const { senha: _, ...safe } = user
    res.json(safe)
  } catch { res.status(500).json({ error: 'Erro ao atualizar usuário' }) }
})

export default router
