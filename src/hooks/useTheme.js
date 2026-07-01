import { useState, useCallback } from 'react'
import { applyTheme, getStoredTheme, prefersDark, resolveInitialTheme } from '../utils/theme.js'

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    resolveInitialTheme(getStoredTheme(), prefersDark())
  )

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
