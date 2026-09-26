import { moduleNumber, SECTIONS, modulesBySection } from '../../modules/registry'
import { isCompleted } from '../../lib/progress'

export function Sidebar({ activeModuleId }: { activeModuleId?: string }) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] space-y-5 overflow-y-auto py-6 pr-2 text-sm">
        {SECTIONS.map((section, si) => (
          <div key={section.id}>
            <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {si + 1}. {section.title}
            </div>
            <ul className="space-y-0.5">
              {modulesBySection(section.id).map((m) => {
                const active = m.id === activeModuleId
                const done = isCompleted(m.id)
                return (
                  <li key={m.id}>
                    <a
                      href={`#/modules/${m.id}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
                        active
                          ? 'bg-primary/15 font-medium text-primary-bright'
                          : 'text-ink-muted hover:bg-surface-raised/60 hover:text-ink'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-ink-muted/70">{moduleNumber(m)}</span>
                      <span className="flex-1 truncate">{m.title}</span>
                      {done && <span className="text-xs text-success">✓</span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
