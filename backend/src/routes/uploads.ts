import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()
router.use(authenticate)

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  }
})

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ALLOWED_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo de arquivo não permitido'))
  }
})

router.post('/:requisicaoId', upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files?.length) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const attachments = await Promise.all(files.map(f =>
      prisma.attachment.create({
        data: {
          requisicaoId: req.params.requisicaoId,
          nome: f.originalname,
          tipo: f.mimetype,
          tamanho: f.size,
          path: f.filename,
          uploadedBy: req.user!.id,
        }
      })
    ))
    res.json(attachments)
  } catch { res.status(500).json({ error: 'Erro ao fazer upload' }) }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.attachment.delete({ where: { id: req.params.id } })
    res.json({ message: 'Arquivo excluído' })
  } catch { res.status(500).json({ error: 'Erro ao excluir arquivo' }) }
})

export default router
