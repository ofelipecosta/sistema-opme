import { createContext, useContext, useState, useEffect } from 'react'

interface ThemeCtx { isDark: boolean; toggle: () => void }
const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const dark = localStorage.getItem('opme_theme') === 'dark'
    if (dark) document.documentElement.classList.add('dark')
    return dark
  })

  useEffect(() => {
    localStorage.setItem('opme_theme', isDark ? 'dark' : 'light')
    document.documentElement.style.setProperty('--app-bg', isDark ? '#111827' : '#f8fafc')
    isDark
      ? document.documentElement.classList.add('dark')
      : document.documentElement.classList.remove('dark')
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
