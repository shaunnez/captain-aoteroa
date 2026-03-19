import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { password } = req.body
  if (!password) {
    res.status(400).json({ error: 'Password required' })
    return
  }
  if (password !== config.presenterSecret) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }
  const token = jwt.sign({ role: 'organiser' }, config.jwtSecret, { expiresIn: '24h' })
  res.json({ token })
})
