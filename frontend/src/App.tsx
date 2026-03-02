import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import Dashboard from '@/pages/Dashboard'
import { appRoutes } from '@/routes/appRoutes'

/**
 * App defines only the route tree.
 * BrowserRouter and QueryClientProvider are already set up in main.tsx.
 */
export const App = () => {
  return (
    <Routes>
      {/* Default: redirect root to dashboard */}
      <Route
        path="/"
        element={<Navigate to={appRoutes.dashboard.path} replace />}
      />

      {/* Main layout wraps all authenticated pages */}
      <Route element={<MainLayout />}>
        <Route path={appRoutes.dashboard.path} element={<Dashboard />} />
        {/* Add more nested routes here as the app grows */}
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to={appRoutes.dashboard.path} replace />}
      />
    </Routes>
  )
}
