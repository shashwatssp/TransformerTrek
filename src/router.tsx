/**
 * Minimal hash-based router — zero dependencies, Vercel-friendly.
 * Routes look like: #/modules/attention, #/playground, #/glossary
 */
import { useCallback, useEffect, useState } from 'react'

export type Route = { path: string; parts: string[] }

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const path = raw.split('?')[0]
  const parts = path.split('/').filter(Boolean)
  return { path, parts }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function navigate(to: string) {
  window.location.hash = to
  window.scrollTo(0, 0)
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), [])
}

/** Scroll to top on route path change */
export function useScrollTopOnRoute(path: string) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])
}
