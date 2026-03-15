import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { UserSessionProvider } from './components/UserSessionProvider'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserSessionProvider>
        <App />
      </UserSessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
