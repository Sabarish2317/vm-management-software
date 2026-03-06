import { Navigate, Outlet } from 'react-router-dom'
import Cookies from 'js-cookie'
import { appRoutes } from '../../routes/appRoutes'
import { isTokenExpired } from '../../utils/isJwtExpired'

export const TOKEN_KEY = 'VM_TOKEN'

const ProtectedRoute = () => {
  const token = Cookies.get(TOKEN_KEY)

  // No token or expired token → redirect to login
  if (!token || isTokenExpired(token)) {
    Cookies.remove(TOKEN_KEY)
    localStorage.removeItem('VM_USER')
    return <Navigate to={appRoutes.signInPage} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
