import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  exp: number
  [key: string]: any
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    const currentTime = Date.now() / 1000 // in seconds
    const isExpired = decoded.exp < currentTime

    console.log('🔍 Token Debug:', {
      tokenExp: decoded.exp,
      currentTime: Math.floor(currentTime),
      isExpired,
      expDate: new Date(decoded.exp * 1000).toLocaleString(),
      nowDate: new Date().toLocaleString(),
    })

    return isExpired
  } catch (err) {
    console.error('❌ Token decode error:', err)
    return true // Treat malformed token as expired
  }
}
