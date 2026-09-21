import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { queryClient } from './app/queryClient'
import { router } from './app/router'

/**
 * Starts the MSW worker before the first render, so no request can escape
 * unmocked. Dropped from production builds entirely — import.meta.env.DEV is
 * statically false there, so this branch and MSW itself are tree-shaken out.
 *
 * Note there is no store Provider: Zustand stores are hooks, so only TanStack
 * Query needs one, for its cache.
 */
async function enableMocking() {
  if (!import.meta.env.DEV) return

  const { worker } = await import('./mocks/browser')
  await worker.start()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
