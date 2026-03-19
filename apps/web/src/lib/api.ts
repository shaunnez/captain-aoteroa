import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002'

export const api = axios.create({ baseURL: API_URL })

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('caption_organiser_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
