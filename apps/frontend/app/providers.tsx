'use client'

import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './components/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster position="top-right" />
    </ThemeProvider>
  )
}

