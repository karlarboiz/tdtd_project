import type { AuthTokensResponse, AuthUser } from '@/types/schema'
import { apiJson } from '@/lib/http'

export function signup(input: {
  firstName: string
  lastName: string
  email: string
  password: string
}): Promise<AuthTokensResponse> {
  return apiJson<AuthTokensResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function login(input: {
  email: string
  password: string
}): Promise<AuthTokensResponse> {
  return apiJson<AuthTokensResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function refreshSession(refreshToken: string): Promise<AuthTokensResponse> {
  return apiJson<AuthTokensResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export function logout(refreshToken: string): Promise<void> {
  return apiJson<void>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export function fetchMe(): Promise<AuthUser> {
  return apiJson<AuthUser>('/api/auth/me')
}
