import { completedCount } from '../../lib/progress'
import { MODULES } from '../../modules/registry'

export function TopNav({ activePath }: { activePath: string }) {
  const link = (href: string, label: string) => {
    const active = activePath === href.replace(/^#/, '') || (href === '#/' && activePath === '/')
    return (
      <a
        key={href}
        href={href}
        className={`rounded-md px-2.5 py-1 transition ${
          active ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {label}
      </a>
    )
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-void/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#/" className="text-base font-semibold tracking-tight sm:text-lg">
          Transformer<span className="text-accent">Trek</span>
        </a>
        <nav className="flex items-center gap-1 text-sm">
          {link('#/', 'Trek')}
          {link('#/playground', 'Playground')}
          {link('#/glossary', 'Glossary')}
          <span className="ml-2 hidden rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 font-mono text-xs text-success sm:inline">
            {completedCount()}/{MODULES.length}
          </span>
        </nav>
      </div>
    </header>
  )
}
