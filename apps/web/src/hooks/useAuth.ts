const TOKEN_KEY = 'caption_organiser_token'

export function useAuth() {
  function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  }

  function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  }

  function isAuthenticated(): boolean {
    const token = getToken()
    if (!token) return false
    try {
      // Decode JWT payload without verifying signature (client-side check only)
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp > Date.now() / 1000
    } catch {
      return false
    }
  }

  return { getToken, setToken, clearToken, isAuthenticated }
}
