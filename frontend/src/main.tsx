/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import { Toaster } from 'react-hot-toast'
import { App } from './App'
// Optional: Include React Scan only in development
if (!import.meta.env.PROD) {
  const script = document.createElement('script')
  script.src = 'https://unpkg.com/react-scan/dist/auto.global.js'
  script.async = true
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient()}>
    <BrowserRouter>
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName="mt-3"
        containerStyle={{}}
        toasterId="default"
        // toastOptions={{
        //    Define default options
        //   className: '',
        //   duration: 5000,
        //   removeDelay: 1000,
        //   style: {
        //     background: '#363636',
        //     color: '#fff',
        //   },

        //   Default options for specific types
        //   success: {
        //     duration: 3000,
        //     iconTheme: {
        //       primary: 'green',
        //       secondary: 'black',
        //     },
        //   },
        // }}
      />
      <App />
    </BrowserRouter>
  </QueryClientProvider>
)
