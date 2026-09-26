import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button, WidgetFrame } from '../../components/ui'
import { gaussian, seededRandom, softmax } from '../../lib/math'

const TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat']

type Stage = {
  id: string
  label: string
  detail: string
}

const STAGES: Stage[] = [
  {
    id: 'tokens',
    label: 'Tokenized text',
    detail:
      'The tokenizer converts the raw string into vocabulary IDs. These IDs are the only thing the model ever sees.',
  },
  {
    id: 'embed',
    label: 'Embedding lookup',
    detail:
      'Each token ID selects a learned vector (d_model dims). A positional signal is added so "the cat" and "cat the" embed differently, attention itself is order-blind.',
  },
  {
    id: 'b1-attn',
    label: 'Block 1 · multi-head self-attention',
    detail:
      'Tokens exchange information: every token computes queries, keys and values, then replaces its own vector with a weighted mix of its neighbors\' values (see Module 2.4).',
  },
  {
    id: 'b1-mlp',
    label: 'Block 1 · MLP, Add & Norm',
    detail:
      'Each token vector is expanded ~4×, passed through a non-linearity (GELU), projected back, then added to the residual stream and layer-normalized.',
  },
  {
    id: 'b2-attn',
    label: 'Block 2 · multi-head self-attention',
    detail:
      'Same operation, new weights. Early blocks tend to learn syntax-level patterns; later blocks build more abstract, task-relevant features.',
  },
  {
    id: 'b2-mlp',
    label: 'Block 2 · MLP, Add & Norm',
    detail:
      'The second block\'s feed-forward pass. Real GPT-class models stack dozens of these blocks, GPT-3 used 96.',
  },
  {
    id: 'out',
    label: 'Unembedding → next-token probabilities',
    detail:
      'The final vector of the last position is projected back to vocabulary size (unembedding) and softmaxed into a probability for every possible next token.',
  },
]

const LAST = STAGES.length - 1

// Final-stage probabilities: seeded "unembedding" logits computed live via real softmax.
const OUT_CANDIDATES = [' mat', ' couch', ' floor', ' sofa']
const outRand = seededRandom(42)
const outLogits = OUT_CANDIDATES.map(() => +(gaussian(outRand) * 1.4).toFixed(2))
const outProbs = softmax(outLogits, 1)

function TokenChips({ tone }: { tone: 'raw' | 'vector' }) {
  const reduced = useReducedMotion()
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Tokens at this stage">
      {TOKENS.map((t, i) => (
        <motion.span
          key={`${t}-${i}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          className={`rounded border px-2 py-0.5 font-mono text-xs ${
            tone === 'raw' ? 'border-border bg-surface text-ink' : 'border-accent/40 bg-accent/10 text-accent'
          }`}
        >
          {tone === 'raw' ? t : `[${t} → vec]`}
        </motion.span>
      ))}
    </div>
  )
}

/**
 * Animated flow of tokens through a (mini) decoder-only transformer stack.
 * Stages advance with play controls; each block expands to explain its internals.
 */
export function ArchitectureFlow() {
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, LAST))
    }, 1200)
    return () => window.clearInterval(t)
  }, [playing])

  useEffect(() => {
    if (playing && stage >= LAST) setPlaying(false)
  }, [playing, stage])

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <WidgetFrame
      title="Token flow through the stack"
      subtitle="Watch the same six tokens transform stage by stage. Press play, step manually, or click a block to expand its internals."
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Animation controls">
        <button
          onClick={() => setPlaying((pl) => !pl)}
          aria-pressed={playing}
          aria-label={playing ? 'Pause token flow animation' : 'Play token flow animation'}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <Button variant="ghost" onClick={() => setStage((s) => Math.max(0, s - 1))}>◀ Prev</Button>
        <Button variant="ghost" onClick={() => setStage((s) => Math.min(LAST, s + 1))}>Next ▶</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPlaying(false)
            setStage(0)
            setOpen(new Set())
          }}
        >
          ↺ Reset
        </Button>
        <span className="font-mono text-xs text-ink-muted" aria-live="polite">
          stage {stage + 1}/{STAGES.length}
        </span>
      </div>

      {/* The stack */}
      <ol className="mt-4 space-y-2">
        {STAGES.map((st, i) => {
          const active = i === stage
          const past = i < stage
          const expanded = open.has(i)
          return (
            <li key={st.id}>
              <motion.div
                animate={{
                  boxShadow:
                    active && !reduced
                      ? '0 0 0 1px color-mix(in srgb, var(--color-accent) 40%, transparent), 0 0 22px color-mix(in srgb, var(--color-accent) 22%, transparent)'
                      : '0 0 0 0 color-mix(in srgb, var(--color-accent) 0%, transparent)',
                }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 24 }}
                className={`rounded-lg border transition-colors ${
                  active ? 'border-accent/60 bg-accent/5' : past ? 'border-border bg-surface-raised/30' : 'border-border bg-surface'
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={expanded}
                  aria-label={`${st.label}, ${expanded ? 'hide' : 'show'} internals`}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] ${active ? 'text-accent' : 'text-ink-muted'}`}>
                      {i + 1}
                    </span>
                    <span className={`text-sm font-medium ${active ? 'text-accent' : past ? 'text-ink' : 'text-ink-muted'}`}>
                      {st.label}
                    </span>
                    {active && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">active</span>}
                  </span>
                  <span aria-hidden className={`text-xs text-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="detail"
                      initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-border/60"
                      role="region"
                    >
                      <div className="px-3 py-2">
                        <p className="text-xs leading-5 text-ink/80">{st.detail}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                {active && (
                  <motion.div
                    key={`panel-${stage}`}
                    initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-t border-border/60"
                  >
                    <div className="px-3 py-3">
                    {i === LAST ? (
                      <div>
                        <p className="mb-2 text-xs text-ink-muted">
                          Next token after "The cat sat on the mat", seeded logits, real softmax:
                        </p>
                        <ul className="space-y-1" aria-label="Next-token probabilities">
                          {OUT_CANDIDATES.map((c, ci) => (
                            <li key={c} className="flex items-center gap-2 text-xs">
                              <span className="w-14 shrink-0 text-right font-mono text-ink">{c}</span>
                              <span className="relative h-3.5 flex-1 overflow-hidden rounded bg-surface-raised">
                                <motion.span
                                  className="absolute inset-y-0 left-0 rounded bg-accent"
                                  initial={false}
                                  animate={{ width: `${outProbs[ci] * 100}%` }}
                                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 26 }}
                                />
                              </span>
                              <span className="w-12 shrink-0 font-mono text-ink-muted">
                                {(outProbs[ci] * 100).toFixed(1)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <TokenChips tone={i === 0 ? 'raw' : 'vector'} />
                    )}
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            </li>
          )
        })}
      </ol>

      <p className="mt-3 text-[11px] leading-5 text-ink-muted">
        Two blocks shown for clarity, the real thing stacks N of them (GPT-3: 96) with the same
        residual stream running all the way through.
      </p>
    </WidgetFrame>
  )
}
