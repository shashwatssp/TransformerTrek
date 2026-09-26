/**
 * LlmJudgeExplainer, you judge two answers, then see how an LLM judge
 * scores them under a rubric. Toggle between a naive (verbosity-biased)
 * judge and a balanced one: the weighted scores are recomputed live and the
 * winner can flip, that's the bias lesson.
 */
import { useState } from 'react'
import { FadeSwitch, Tabs } from '../../components/ui'

const PROMPT = 'Why is the sky blue? Answer in one sentence.'

const CANDIDATES = {
  A: {
    label: 'Answer A',
    text: 'Air scatters short blue wavelengths of sunlight more strongly than long red ones, and that scattered blue light is what fills the sky.',
    accurate: true,
  },
  B: {
    label: 'Answer B',
    text: 'The sky is blue due to many complex factors in the atmosphere interacting with light in various interesting ways; chiefly, the ocean reflects blue light upward into the sky, tinting the air above it.',
    accurate: false, // ocean-reflection is a myth
  },
} as const

type JudgeMode = 'balanced' | 'naive'

const WEIGHTS: Record<JudgeMode, { accuracy: number; clarity: number; thoroughness: number }> = {
  balanced: { accuracy: 0.6, clarity: 0.3, thoroughness: 0.1 },
  naive: { accuracy: 0.2, clarity: 0.2, thoroughness: 0.6 }, // verbosity bias
}

// Judge scores (1–5). B scores low on accuracy (it's wrong) but the naive
// judge's heavy "thoroughness" weight lets verbosity drag it back up.
const SCORES = {
  A: { accuracy: 5.0, clarity: 4.5, thoroughness: 3.5 },
  B: { accuracy: 1.5, clarity: 2.0, thoroughness: 4.5 },
} as const

function weightedTotal(c: keyof typeof SCORES, mode: JudgeMode): number {
  const w = WEIGHTS[mode]
  const s = SCORES[c]
  return s.accuracy * w.accuracy + s.clarity * w.clarity + s.thoroughness * w.thoroughness
}

export function LlmJudgeExplainer() {
  const [tab, setTab] = useState('You judge')
  const [humanPick, setHumanPick] = useState<'A' | 'B' | null>(null)

  return (
    <div className="space-y-4">
      <Tabs tabs={['You judge', 'How the judge thinks']} active={tab} onChange={setTab} />
      <FadeSwitch activeKey={tab}>
        {tab === 'You judge' ? (
          <YouJudgeTab humanPick={humanPick} setHumanPick={setHumanPick} />
        ) : (
          <JudgeMechanicsTab humanPick={humanPick} />
        )}
      </FadeSwitch>
    </div>
  )
}

function YouJudgeTab({
  humanPick,
  setHumanPick,
}: {
  humanPick: 'A' | 'B' | null
  setHumanPick: (p: 'A' | 'B') => void
}) {
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="rounded-lg border border-border bg-surface-raised/60 px-3 py-2 text-sm">
        <span className="mr-2 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-bright">PROMPT</span>
        {PROMPT}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(['A', 'B'] as const).map((key) => {
          const c = CANDIDATES[key]
          const picked = humanPick === key
          return (
            <div key={key} className={`rounded-lg border p-3 ${picked ? 'border-accent bg-accent/5' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{c.label}</span>
                <button
                  onClick={() => setHumanPick(key)}
                  aria-pressed={picked}
                  aria-label={`Choose ${c.label} as the better answer`}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                    picked ? 'border-accent bg-accent/15 text-accent' : 'border-border text-ink-muted hover:bg-surface-raised hover:text-ink'
                  }`}
                >
                  {picked ? '✓ your pick' : 'pick this one'}
                </button>
              </div>
              <p className="mt-2 text-sm text-ink/85">{c.text}</p>
              <p className="mt-2 font-mono text-[10px] text-ink-muted">
                {c.text.split(/\s+/).length} words · accuracy: {c.accurate ? 'correct' : 'contains an error'}
              </p>
            </div>
          )
        })}
      </div>
      {humanPick && (
        <p className="rounded border border-success/30 bg-success/5 px-3 py-2 text-xs text-ink/85">
          You picked {CANDIDATES[humanPick].label}. Now open "How the judge thinks", will the
          rubric agree with you, and under which weights?
        </p>
      )}
      {!humanPick && (
        <p className="text-xs text-ink-muted">Read both, then pick the better one. One answer is not what it seems.</p>
      )}
    </div>
  )
}

function JudgeMechanicsTab({ humanPick }: { humanPick: 'A' | 'B' | null }) {
  const [mode, setMode] = useState<JudgeMode>('balanced')

  const aTotal = weightedTotal('A', mode)
  const bTotal = weightedTotal('B', mode)
  const winner = aTotal >= bTotal ? 'A' : 'B'
  const agreesWithHuman = humanPick ? winner === humanPick : null

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Judge configuration">
        {(
          [
            ['balanced', 'Balanced rubric (accuracy 60%)'],
            ['naive', 'Naive judge (thoroughness 60%)'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            aria-label={`Judge mode: ${label}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              mode === key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted hover:bg-surface-raised hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-surface-raised/60 text-ink-muted">
              <th className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">Dimension</th>
              <th className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">Weight</th>
              <th className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">A score</th>
              <th className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">B score</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['accuracy', 'Factual accuracy'],
                ['clarity', 'Clarity'],
                ['thoroughness', 'Thoroughness'],
              ] as const
            ).map(([dim, label]) => (
              <tr key={dim} className="border-t border-border">
                <td className="px-2 py-1.5 text-ink/85 sm:px-3 sm:py-2">{label}</td>
                <td className="px-2 py-1.5 font-mono text-accent sm:px-3 sm:py-2">{(WEIGHTS[mode][dim] * 100).toFixed(0)}%</td>
                <td className="px-2 py-1.5 font-mono text-ink/85 sm:px-3 sm:py-2">{SCORES.A[dim].toFixed(1)}</td>
                <td className="px-2 py-1.5 font-mono text-ink/85 sm:px-3 sm:py-2">{SCORES.B[dim].toFixed(1)}</td>
              </tr>
            ))}
            <tr className="border-t border-border bg-surface-raised/40">
              <td className="px-2 py-1.5 font-semibold text-ink sm:px-3 sm:py-2">Weighted total</td>
              <td className="px-2 py-1.5 font-mono text-ink-muted sm:px-3 sm:py-2">100%</td>
              <td className={`px-2 py-1.5 font-mono font-semibold sm:px-3 sm:py-2 ${winner === 'A' ? 'text-accent' : 'text-ink/85'}`}>{aTotal.toFixed(2)}</td>
              <td className={`px-2 py-1.5 font-mono font-semibold sm:px-3 sm:py-2 ${winner === 'B' ? 'text-accent' : 'text-ink/85'}`}>{bTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="rounded border border-border bg-surface-raised/60 px-3 py-2 text-xs text-ink/85">
        Judge verdict: <strong className="text-accent">Answer {winner}</strong> wins under the{' '}
        {mode === 'naive' ? 'naive' : 'balanced'} rubric
        {humanPick ? (
          agreesWithHuman ? (
            <>, matching your pick. ✓</>
          ) : (
            <>, <strong>overruling your pick</strong>. Notice what did it: {mode === 'naive' ? 'B lost on accuracy but won on "thoroughness", verbosity bias.' : 'the accuracy-heavy rubric punished B\'s factual error.'}</>
          )
        ) : (
          '. Pick an answer in the first tab to compare against your own judgment.'
        )}
      </p>

      <ul className="list-disc space-y-1 pl-6 text-[11px] leading-5 text-ink-muted">
        <li><strong className="text-ink">Verbosity bias</strong>, judges systematically favor longer answers (the naive rubric above). Seen in MT-Bench-style evaluations.</li>
        <li><strong className="text-ink">Position bias</strong>, swap A and B in the prompt and scores drift; strong judges randomize order and average.</li>
        <li><strong className="text-ink">Self-preference</strong>, a judge from the same model family rates its own outputs higher.</li>
      </ul>
      <p className="text-[11px] leading-5 text-ink-muted">
        Bias catalog from{' '}
        <a href="https://arxiv.org/abs/2306.05685" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena
        </a>
        .
      </p>
    </div>
  )
}
