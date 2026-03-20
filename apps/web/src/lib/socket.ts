import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002'

// Singleton socket — do not reconnect on every render
export const socket = io(API_URL, {
  autoConnect: false,
  auth: async (cb) => {
    const { data: { session } } = await supabase.auth.getSession()
    cb({ token: session?.access_token ?? '' })
  },
}) as Socket<ServerToClientEvents, ClientToServerEvents>
