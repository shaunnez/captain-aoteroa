import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)

export async function verifyJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = header.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  // Attach user to request for downstream use
  ;(req as any).user = user
  next()
}
