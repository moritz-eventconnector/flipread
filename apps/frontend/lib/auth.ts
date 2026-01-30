import Cookies from 'js-cookie'
import api from './api'

export interface User {
  id: number
  email: string
  role: string
  is_active: boolean
  is_email_verified: boolean
  hosting_enabled: boolean
  has_active_hosting: boolean
  can_publish: boolean
  created_at: string
  last_login: string | null
}

export interface AuthResponse {
  user: User
  tokens: {
    access: string
    refresh: string
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post('/auth/login/', { email, password })
  const data: AuthResponse = response.data

  // Store tokens
  Cookies.set('access_token', data.tokens.access, { expires: 1 })
  Cookies.set('refresh_token', data.tokens.refresh, { expires: 7 })

  return data
}

export async function register(email: string, password: string, passwordConfirm: string): Promise<AuthResponse> {
  const response = await api.post('/auth/register/', {
    email,
    password,
    password_confirm: passwordConfirm,
  })
  const data: AuthResponse = response.data

  // Store tokens
  Cookies.set('access_token', data.tokens.access, { expires: 1 })
  Cookies.set('refresh_token', data.tokens.refresh, { expires: 7 })

  return data
}

export async function logout() {
  Cookies.remove('access_token')
  Cookies.remove('refresh_token')
  window.location.href = '/app/login'
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get('/auth/profile/')
    return response.data
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('access_token')
}

