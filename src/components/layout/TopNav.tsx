import type { ReactNode } from 'react'
import { useCompletedCount } from '../../lib/progress'
import { toggleTheme, useTheme } from '../../lib/theme'
import { MODULES } from '../../modules/registry'

export function TopNav({ activePath }: { activePath: string }) {
  const completed = useCompletedCount()
  const theme = useTheme()
  const link = (href: string, label: ReactNode) => {
    const active = activePath === href
    return (
      <a
        key={href}
        href={href}
        className={`flex min-h-9 items-center whitespace-nowrap rounded-md px-2 py-1.5 transition sm:px-2.5 sm:py-1 ${
          active ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {label}
      </a>
    )
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-void/90 backdrop-blur">
      {/* Wraps to a second row on narrow phones instead of overflowing the
          viewport, so Glossary and the theme toggle are always on screen. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-3">
        <a href="/" className="shrink-0 text-sm font-semibold tracking-tight sm:text-lg">
          Transformer<span className="text-accent">Trek</span>
        </a>
        <nav className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs sm:gap-1 sm:text-sm">
          {link('/', 'Trek')}
          {link('/visualizations', 'Visuals')}
          {link(
            '/playground',
            <>
              <span className="sm:hidden">Play</span>
              <span className="hidden sm:inline">Playground</span>
            </>,
          )}
          {link('/review', 'Review')}
          {link('/glossary', 'Glossary')}
          <span
            aria-label={`${completed} of ${MODULES.length} modules marked as read on this device`}
            className="ml-2 hidden rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 font-mono text-xs text-success sm:inline"
          >
            {completed}/{MODULES.length}
          </span>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="ml-0.5 rounded-md border border-border p-2 text-ink-muted transition hover:text-ink sm:ml-1"
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}
