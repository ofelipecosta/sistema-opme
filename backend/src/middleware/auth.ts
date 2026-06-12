import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { id: string; perfil: string; nome: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'secret') as { id: string; perfil: string; nome: string }
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso não autorizado' })
  }
  next()
}
