import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import Dashboard from '@/pages/Dashboard'
import SignIn from '@/pages/SignIn'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { appRoutes } from '@/routes/appRoutes'

/**
 * App defines only the route tree.
 * BrowserRouter and QueryClientProvider are already set up in main.tsx.
 */
export const App = () => {
  return (
    <Routes>
      {/* Public: sign-in page */}
      <Route path={appRoutes.signInPage} element={<SignIn />} />

      {/* Default: redirect root to dashboard */}
      <Route
        path="/"
        element={<Navigate to={appRoutes.dashboard.path} replace />}
      />

      {/* Protected: all authenticated pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path={appRoutes.dashboard.path} element={<Dashboard />} />
          {/* Add more nested routes here as the app grows */}
        </Route>
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to={appRoutes.dashboard.path} replace />}
      />
    </Routes>
  )
}
