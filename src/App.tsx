export default function App() {
  return (
    <div className="min-h-screen bg-void text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Transformer<span className="text-accent">Trek</span>
          </span>
          <nav className="text-sm text-ink-muted">
            <span>Modules coming soon</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-5xl font-bold tracking-tight">
          See how AI
          <span className="text-primary-bright"> actually</span> works.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-muted">
          Interactive, visual explanations of transformers, LLMs, and agents —
          from tokens and attention to MCP, A2A, and beyond.
        </p>
        <p className="mt-12 text-sm text-ink-muted">
          🚧 Under construction — the trek is just beginning.
        </p>
      </main>
    </div>
  )
}
