/**
 * queries/authService.ts
 *
 * API calls for authentication (login, register, me).
 */
import axiosInstance from '@/utils/axios'

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthResponse {
  success: boolean
  token: string
  user: AuthUser
}

export async function loginUser(
  credentials: AuthCredentials
): Promise<AuthResponse> {
  const { data } = await axiosInstance.post<AuthResponse>(
    '/api/auth/login',
    credentials
  )
  return data
}

export async function registerUser(
  credentials: AuthCredentials
): Promise<AuthResponse> {
  const { data } = await axiosInstance.post<AuthResponse>(
    '/api/auth/register',
    credentials
  )
  return data
}

export async function getMe(): Promise<{ success: boolean; user: AuthUser }> {
  const { data } = await axiosInstance.get('/api/auth/me')
  return data
}
