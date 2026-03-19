import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { config } from './config'
import { authRouter } from './routes/auth'
import { eventsRouter } from './routes/events'
import { translateRouter } from './routes/translate'
import { setupSocketHandler } from './services/SocketHandler'

const app = express()
const httpServer = createServer(app)

export const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
})

app.use(cors({ origin: config.clientUrl }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/events', eventsRouter)
app.use('/api/translate', translateRouter)

setupSocketHandler(io)

export { app }

// Only start server when run directly (not when imported in tests)
if (require.main === module) {
  httpServer.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`)
  })
}
