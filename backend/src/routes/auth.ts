import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.post('/login', async (req, res) => {
  try {
    const { login, senha } = req.body
    if (!login || !senha) return res.status(400).json({ error: 'Login e senha obrigatórios' })

    const user = await prisma.user.findUnique({ where: { login } })
    if (!user || user.status !== 'ativo') return res.status(401).json({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(senha, user.senha)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

    const token = jwt.sign(
      { id: user.id, perfil: user.perfil, nome: user.nome },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const { senha: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' })
  }
})

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logout realizado' })
})

export default router
