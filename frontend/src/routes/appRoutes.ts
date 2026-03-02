/**
 * Central place for all client-side route paths.
 * Import this wherever you need to navigate or build links.
 */
export const appRoutes = {
  dashboard: {
    path: '/dashboard',
  },
  master: {
    path: '/master',
  },
  orders: {
    path: '/orders',
  },
  userManagement: {
    path: '/users',
  },
  signInPage: '/sign-in',
} as const
