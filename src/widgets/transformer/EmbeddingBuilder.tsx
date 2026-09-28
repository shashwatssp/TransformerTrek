import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Button, WidgetFrame } from '../../components/ui'
import { gaussian, seededRandom } from '../../lib/math'

/**
 * Walks through every arithmetic step of embedding creation on a toy vocab:
 * raw text → tokens → vocab IDs → one-hot row → one-hot × matrix (a row
 * lookup) → dense vector. The matrix values are seeded but the multiplication
 * logic is the real thing: a one-hot row times a matrix selects that row.
 */

const VOCAB = ['<pad>', '<unk>', 'the', 'cat', 'sat', 'on', 'mat', 'dog', 'a', 'ran']
const SENTENCE = 'the cat sat'
const TOKENS = SENTENCE.split(' ')
const IDS = TOKENS.map((t) => Math.max(0, VOCAB.indexOf(t)))
const D_MODEL = 6

// Embedding matrix: vocab_size × d_model, seeded once at module load.
const MATRIX: number[][] = (() => {
  const rand = seededRandom(2024)
  return VOCAB.map(() => Array.from({ length: D_MODEL }, () => +(gaussian(rand) * 0.9).toFixed(2)))
})()

const STAGES = [
  { id: 'text', label: 'Raw text' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'ids', label: 'Vocab IDs' },
  { id: 'onehot', label: 'One-hot row' },
  { id: 'matrix', label: 'Embedding matrix' },
  { id: 'vector', label: 'Dense vector' },
]
const LAST = STAGES.length - 1

const STAGE_DETAILS: string[] = [
  'Everything starts as an ordinary string. A neural network cannot multiply letters, so this is the last moment the model ever "sees" these characters.',
  'The tokenizer splits the string into subword tokens using its learned vocabulary. These are the atoms the model reads and writes.',
  'Each token is replaced by its integer position in the vocabulary. So far this is just bookkeeping: ID 3 has no relationship to ID 4, they are opaque categories.',
  'To use an ID in arithmetic, the classic first move is a one-hot vector: length equal to the vocabulary, a single 1 at the token\'s position, zeros everywhere else. Wasteful but exact.',
  'The embedding matrix is a learnable table of shape vocab_size × d_model. Multiplying the one-hot row by this matrix does exactly one thing: it selects the row at the position of the 1. That is why "embedding lookup" and "matrix multiply" are the same operation.',
  'What comes out is a dense vector of d_model numbers. Every dimension participates in every later computation, and pretraining is what teaches these directions to mean something. Stack one vector per token and the sequence is ready for the transformer stack.',
]

function Cell({ value, active, tone }: { value: number | string; active?: boolean; tone?: 'hot' | 'muted' }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded border font-mono text-[10px] ${
        active
          ? 'border-accent bg-accent/25 text-accent font-bold'
          : tone === 'hot'
            ? 'border-border bg-surface-raised/60 text-ink'
            : 'border-border/60 bg-surface text-ink-muted'
      }`}
    >
      {value}
    </span>
  )
}

function HeatRow({ vec, small }: { vec: number[]; small?: boolean }) {
  const max = Math.max(...vec.map((v) => Math.abs(v)), 0.01)
  return (
    <span className="inline-flex gap-0.5">
      {vec.map((v, i) => {
        const pos = v >= 0
        const alpha = Math.min(1, Math.abs(v) / max) * 0.55 + 0.08
        return (
          <span
            key={i}
            title={`dim ${i}: ${v}`}
            className={`inline-flex items-center justify-center rounded font-mono ${
              small ? 'h-6 w-7 text-[9px]' : 'h-8 w-10 text-[11px]'
            }`}
            style={{
              background: pos
                ? `color-mix(in srgb, var(--color-accent) ${alpha * 100}%, transparent)`
                : `color-mix(in srgb, var(--color-danger) ${alpha * 100}%, transparent)`,
              color: 'var(--color-ink)',
            }}
          >
            {v.toFixed(1)}
          </span>
        )
      })}
    </span>
  )
}

export function EmbeddingBuilder() {
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [sel, setSel] = useState(1) // follow the token "cat"
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => setStage((s) => Math.min(s + 1, LAST)), 1500)
    return () => window.clearInterval(t)
  }, [playing])

  useEffect(() => {
    if (playing && stage >= LAST) setPlaying(false)
  }, [playing, stage])

  const id = IDS[sel]
  const vec = MATRIX[id]

  return (
    <WidgetFrame
      title="Embedding builder: from text to vector, step by step"
      subtitle="Every arithmetic step of embedding creation on a 10-word toy vocab with d_model = 6. Click a token to follow it through."
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Stage controls">
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          aria-label={playing ? 'Pause embedding walk-through' : 'Play embedding walk-through'}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <Button variant="ghost" onClick={() => setStage((s) => Math.max(0, s - 1))}>◀ Prev</Button>
        <Button variant="ghost" onClick={() => setStage((s) => Math.min(LAST, s + 1))}>Next ▶</Button>
        <Button variant="ghost" onClick={() => { setPlaying(false); setStage(0) }}>↺ Reset</Button>
        <span className="font-mono text-xs text-ink-muted" aria-live="polite">
          step {stage + 1}/{STAGES.length}
        </span>
      </div>

      {/* Token selector: always visible so you can re-target mid-walk */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Pick the token to follow">
        <span className="text-xs text-ink-muted">following:</span>
        {TOKENS.map((t, i) => (
          <button
            key={t + i}
            onClick={() => setSel(i)}
            aria-pressed={sel === i}
            className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
              sel === i ? 'border-accent/60 bg-accent/15 text-accent' : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stage rail */}
      <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Stages">
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
              i === stage ? 'border-accent/60 bg-accent/10 text-accent' : i < stage ? 'border-border bg-surface-raised/40 text-ink' : 'border-border/60 text-ink-muted'
            }`}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {/* Stage panel */}
      <motion.div
        key={stage}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 rounded-lg border border-border bg-surface-raised/30 p-4"
        role="region"
        aria-label={STAGES[stage].label}
      >
        {stage === 0 && (
          <p className="font-mono text-lg text-ink" aria-label="Raw text">
            &quot;{SENTENCE}&quot;
          </p>
        )}

        {stage === 1 && (
          <div className="flex flex-wrap gap-2">
            {TOKENS.map((t, i) => (
              <motion.span
                key={t + i}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={`rounded border px-2.5 py-1 font-mono text-sm ${i === sel ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-ink'}`}
              >
                {t}
              </motion.span>
            ))}
          </div>
        )}

        {stage === 2 && (
          <div className="flex flex-wrap gap-2">
            {TOKENS.map((t, i) => (
              <span
                key={t + i}
                className={`inline-flex items-baseline gap-1.5 rounded border px-2.5 py-1 font-mono text-sm ${i === sel ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-ink'}`}
              >
                {t}
                <span className="text-[10px] text-ink-muted">id {IDS[i]}</span>
              </span>
            ))}
            <p className="mt-2 w-full text-xs text-ink-muted">
              Vocab size 10, so every ID is just 0 to 9. Nothing about "cat" and "sat" is comparable yet.
            </p>
          </div>
        )}

        {stage === 3 && (
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-ink-muted">onehot[{id}] =</span>
              <span className="flex flex-wrap gap-1" aria-label={`One-hot row for id ${id}`}>
                {VOCAB.map((v, vi) => (
                  <Cell key={v} value={vi === id ? 1 : 0} active={vi === id} />
                ))}
              </span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              One 1 at position {id} ("{VOCAB[id]}"), nine zeros. A whole 10-number vector to carry one piece of
              information. Real vocabularies are ~50,000 long: imagine 50,000 cells, one hot.
            </p>
          </div>
        )}

        {stage === 4 && (
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
              <div aria-label="Embedding matrix with selected row highlighted">
                <div className="mb-1 font-mono text-[10px] text-ink-muted">W_e (10 × 6)</div>
                {MATRIX.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-1">
                    <span className={`w-12 text-right font-mono text-[9px] ${ri === id ? 'text-accent' : 'text-ink-muted/60'}`}>
                      {ri}:{VOCAB[ri]}
                    </span>
                    <span className={`flex gap-0.5 rounded px-1 ${ri === id ? 'bg-accent/15 ring-1 ring-accent/60' : ''}`}>
                      {row.map((x, ci) => (
                        <span key={ci} className="h-3.5 w-6 font-mono text-[8px] leading-3.5 text-center text-ink-muted">
                          {x.toFixed(1)}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center gap-2 text-xs text-ink-muted sm:max-w-56">
                <p>
                  The one-hot row multiplies W_e from the left. Every zero row contributes nothing; the 1 at row {id}{' '}
                  passes <span className="font-mono text-accent">W_e[{id}]</span> through unchanged.
                </p>
                <p className="rounded border border-border bg-surface px-2 py-1.5 font-mono text-[11px] text-ink">
                  onehot × W_e = row {id}
                </p>
                <p>In practice nobody stores the one-hot: the lookup row directly. The multiply is the <em>explanation</em>, the lookup is the <em>implementation</em>.</p>
              </div>
            </div>
          </div>
        )}

        {stage === 5 && (
          <div>
            <div className="flex flex-col items-start gap-3">
              <div>
                <div className="mb-1 font-mono text-[10px] text-ink-muted">
                  embedding("{VOCAB[id]}") shape (6,)
                </div>
                <HeatRow vec={vec} />
              </div>
              <div>
                <div className="mb-1 font-mono text-[10px] text-ink-muted">full sequence: shape (3, 6), one row per token</div>
                <div className="flex flex-col gap-1">
                  {IDS.map((tid, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <span className={`w-9 text-right font-mono text-[10px] ${ti === sel ? 'text-accent' : 'text-ink-muted'}`}>{TOKENS[ti]}</span>
                      <HeatRow vec={MATRIX[tid]} small />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              This 3 × 6 grid of numbers is all the transformer sees: dense, every cell live. A position signal gets
              added next, then the stack takes over (see the token flow widget in the Architecture module).
            </p>
          </div>
        )}
      </motion.div>

      <p className="mt-3 text-[11px] leading-5 text-ink-muted" aria-live="polite">
        <strong className="text-ink">{STAGES[stage].label}.</strong> {STAGE_DETAILS[stage]}
      </p>
    </WidgetFrame>
  )
}
