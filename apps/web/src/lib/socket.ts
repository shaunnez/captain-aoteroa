import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002'

// Singleton socket — do not reconnect on every render
export const socket = io(API_URL, {
  autoConnect: false,
  auth: (cb) => { cb({ token: localStorage.getItem('caption_organiser_token') ?? '' }) },
}) as Socket<ServerToClientEvents, ClientToServerEvents>
