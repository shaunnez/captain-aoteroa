import { Router } from 'express'

export const authRouter = Router()

// Auth is handled directly by Supabase on the client.
// This route is kept for potential future server-side auth needs.
authRouter.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  // The verifyJWT middleware handles actual verification;
  // this endpoint just confirms the token is present.
  res.json({ authenticated: true })
})
