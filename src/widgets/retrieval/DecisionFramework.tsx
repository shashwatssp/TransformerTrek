/**
 * DecisionFramework, the 4-question "RAG or fine-tune?" helper from AWS
 * Prescriptive Guidance, made interactive. Answers nudge two live-scored
 * meters; the recommendation is computed in the browser from your answers.
 */
import { useMemo, useState } from 'react'
import { ScoreBar } from './shared'

type Answer = string

type Question = {
  id: string
  text: string
  options: { id: Answer; label: string }[]
  why: string
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: '1. What’s missing, knowledge or behavior?',
    options: [
      { id: 'knowledge', label: 'Knowledge: facts it doesn’t have (or can’t see)' },
      { id: 'behavior', label: 'Behavior: wrong style, format, or process' },
      { id: 'both', label: 'Both' },
    ],
    why: 'Retrieval can only supply knowledge; only training changes how the model writes and reasons.',
  },
  {
    id: 'q2',
    text: '2. How often does the knowledge change?',
    options: [
      { id: 'frequent', label: 'Constantly, daily or faster' },
      { id: 'sometimes', label: 'Occasionally, weekly to quarterly' },
      { id: 'rarely', label: 'Rarely, stable for years' },
    ],
    why: 'A re-index is cheap and instant; a re-train is expensive and slow. Frequent change favors retrieval.',
  },
  {
    id: 'q3',
    text: '3. Do answers need citations / provenance?',
    options: [
      { id: 'yes', label: 'Yes, users must verify sources' },
      { id: 'no', label: 'No, style or reasoning matters, not sourcing' },
    ],
    why: 'Weights can’t cite; retrieved chunks can.',
  },
  {
    id: 'q4',
    text: '4. Can you afford the ML loop, labeled data plus training and eval runs?',
    options: [
      { id: 'yes', label: 'Yes, we have data and an ML budget' },
      { id: 'no', label: 'No, we need results this quarter' },
    ],
    why: 'Fine-tuning pays off only if you can fund the dataset and the re-training cycle each time behavior must change.',
  },
]

/** Score adjustments per option id (relative to the question’s base push). */
const WEIGHTS: Record<string, { rag: number; ft: number }> = {
  knowledge: { rag: 2, ft: 0 },
  behavior: { rag: 0, ft: 2 },
  both: { rag: 1, ft: 1 },
  frequent: { rag: 2, ft: 0 },
  sometimes: { rag: 1, ft: 0.5 },
  rarely: { rag: 0.5, ft: 1 },
  yes: { rag: 2, ft: 0 },
  no: { rag: 0.5, ft: 0.5 },
  'q4-yes': { rag: 0.5, ft: 1.5 },
  'q4-no': { rag: 1, ft: 0 },
}

const RECOMMENDATIONS = {
  rag: {
    title: '→ Start with RAG',
    body: 'Your constraints (changing knowledge, provenance, or no ML budget) all point at retrieval. Keep the model frozen; invest in chunking, embedding quality, and retrieval evaluation.',
  },
  ft: {
    title: '→ Fine-tuning earns its keep',
    body: 'Your problem is behavior, style, format, process, and the knowledge it needs is stable. Prepare labeled examples and an eval set before you touch a checkpoint.',
  },
  hybrid: {
    title: '→ Combine them',
    body: 'You need new behavior AND changing knowledge: fine-tune for format and process, then layer RAG on top for facts. This combined pipeline was the strongest performer in the agriculture case study (Balaguer et al., 2024).',
  },
} as const

export default function DecisionFramework() {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const { ragScore, ftScore, reasons, answeredAll } = useMemo(() => {
    let rag = 0
    let ft = 0
    const reasons: string[] = []
    for (const q of QUESTIONS) {
      const a = answers[q.id]
      if (!a) continue
      const key = q.id === 'q4' ? `q4-${a}` : a
      const w = WEIGHTS[key] ?? { rag: 0, ft: 0 }
      rag += w.rag
      ft += w.ft
      reasons.push(`Q${q.id.slice(1)}: ${a} → RAG +${w.rag}, FT +${w.ft}`)
    }
    return {
      ragScore: rag,
      ftScore: ft,
      reasons,
      answeredAll: QUESTIONS.every((q) => answers[q.id]),
    }
  }, [answers])

  const total = ragScore + ftScore
  const verdict = !answeredAll
    ? null
    : ragScore > ftScore + 0.5
      ? RECOMMENDATIONS.rag
      : ftScore > ragScore + 0.5
        ? RECOMMENDATIONS.ft
        : RECOMMENDATIONS.hybrid

  return (
    <div className="space-y-4 text-sm">
      {QUESTIONS.map((q) => (
        <fieldset key={q.id} className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold text-ink">{q.text}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {q.options.map((o) => {
              const active = answers[q.id] === o.id
              return (
                <button
                  key={o.id}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'border-accent/60 bg-accent/10 text-accent'
                      : 'border-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{q.why}</p>
        </fieldset>
      ))}

      <div className="space-y-2 rounded-lg border border-border bg-surface-raised/40 p-4" aria-live="polite">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Live scorecard</div>
        {total === 0 ? (
          <p className="text-ink-muted">Answer the four questions above to score your use case.</p>
        ) : (
          <>
            <ScoreBar label="RAG pressure" value={ragScore} max={Math.max(total, 1)} tone="accent" />
            <ScoreBar label="Fine-tuning pressure" value={ftScore} max={Math.max(total, 1)} tone="highlight" />
            {verdict && (
              <div className="mt-3">
                <div className="text-sm font-semibold text-ink">{verdict.title}</div>
                <p className="mt-1 text-ink/85">{verdict.body}</p>
              </div>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-ink-muted">Show the arithmetic</summary>
              <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-muted">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>
    </div>
  )
}
