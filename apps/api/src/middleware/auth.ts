import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  try {
    jwt.verify(header.slice(7), config.jwtSecret)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
