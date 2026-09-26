import { moduleNumber, SECTIONS, modulesBySection, type ModuleMeta } from '../../modules/registry'
import { useIsCompleted } from '../../lib/progress'

function ModuleRow({ m, active }: { m: ModuleMeta; active: boolean }) {
  // Per-row hook so checkmarks react instantly when a module is marked read
  const done = useIsCompleted(m.id)
  return (
    <a
      href={`/modules/${m.id}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
        active
          ? 'bg-primary/15 font-medium text-primary-bright'
          : 'text-ink-muted hover:bg-surface-raised/60 hover:text-ink'
      }`}
    >
      <span className="font-mono text-[10px] text-ink-muted/70">{moduleNumber(m)}</span>
      <span className="flex-1 truncate">{m.title}</span>
      {done && <span aria-label="marked as read" className="text-xs text-success">✓</span>}
    </a>
  )
}

export function Sidebar({ activeModuleId }: { activeModuleId?: string }) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav aria-label="Modules" className="sticky top-16 max-h-[calc(100vh-4rem)] space-y-5 overflow-y-auto py-6 pr-2 text-sm">
        {SECTIONS.map((section, si) => (
          <div key={section.id}>
            <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {si + 1}. {section.title}
            </div>
            <ul className="space-y-0.5">
              {modulesBySection(section.id).map((m) => (
                <li key={m.id}>
                  <ModuleRow m={m} active={m.id === activeModuleId} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
