import { appRoutes } from '@/routes/appRoutes'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Cookies from 'js-cookie'

export const TOKEN_KEY = 'VM_TOKEN'

// eslint-disable-next-line react-refresh/only-export-components
export function authHandler() {
  const token = Cookies.get(TOKEN_KEY)

  if (!token) {
    HandleUnauthorized()
  }

  return token
}

export function HandleUnauthorized() {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    toast.error('Unauthorized. Please login again.')
    Cookies.remove(TOKEN_KEY)
    localStorage.removeItem('VM_USER')

    setTimeout(() => {
      const currentPath = location.pathname + location.search
      const redirectPath = `${appRoutes.signInPage}?redirect=${encodeURIComponent(currentPath)}`
      navigate(redirectPath, { replace: true })
    }, 2000)
  }
}
