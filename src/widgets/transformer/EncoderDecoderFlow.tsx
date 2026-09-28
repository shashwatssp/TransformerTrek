import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Button, WidgetFrame } from '../../components/ui'
import { gaussian, seededRandom, softmax } from '../../lib/math'

/**
 * The 2017 two-tower architecture, animated. The encoder reads the source with
 * bidirectional attention; the decoder writes the target with a causal mask and
 * pulls from the encoder via cross-attention. Mask grids and output
 * probabilities are computed for real.
 */

const SRC = ['the', 'cat', 'sat']
const DEC = ['<s>', 'le', 'chat']
const CANDIDATES = ['assis', 'dort', 'gris']

const outRand = seededRandom(7)
const outLogits = CANDIDATES.map(() => +(gaussian(outRand) * 1.3).toFixed(2))
const outProbs = softmax(outLogits, 1)

type Stage = {
  id: string
  label: string
  detail: string
}

const STAGES: Stage[] = [
  {
    id: 'src',
    label: 'Source sentence',
    detail:
      'The encoder\'s job is understanding, not generating. It reads the whole source sentence at once and builds a context-aware vector for every token.',
  },
  {
    id: 'enc-attn',
    label: 'Encoder self-attention: bidirectional',
    detail:
      'Every encoder token may attend to every other encoder token, forward and backward. "sat" can look at "cat" and "the" in any direction, so each vector absorbs its full context.',
  },
  {
    id: 'memory',
    label: 'Encoder output: memory',
    detail:
      'After N encoder layers, the output is a set of vectors (one per source token), often called the memory. It is the encoder\'s summary of the input, and the decoder\'s only channel back to it.',
  },
  {
    id: 'dec-in',
    label: 'Decoder input: tokens so far',
    detail:
      'The decoder generates left to right. Its input is the target produced so far (starting from the <s> begin token); its job is to predict the next target token.',
  },
  {
    id: 'dec-self',
    label: 'Decoder self-attention: causal mask',
    detail:
      'Inside the decoder, attention is masked: each position may look only at itself and earlier positions. Position <s> sees nothing else, "le" sees <s>, "chat" sees both. No peeking at tokens that do not exist yet.',
  },
  {
    id: 'cross',
    label: 'Cross-attention: decoder queries the encoder',
    detail:
      'This is the bridge between the towers. Queries come from the decoder, keys and values come from the encoder memory, and the mask here is fully open: every generated token may look at every source token. "chat" can align with "cat" wherever the two sentences put the word.',
  },
  {
    id: 'out',
    label: 'Next-token probabilities',
    detail:
      'The decoder\'s final vectors are projected over the vocabulary and softmaxed. Translation is just next-token prediction conditioned on the encoder memory.',
  },
]
const LAST = STAGES.length - 1

// Node geometry in the SVG viewBox
const ENC_X = 105
const DEC_X = 455
const YS = [48, 115, 182]

function TokenNode({ x, y, label, tone, selected, onClick }: {
  x: number
  y: number
  label: string
  tone: 'enc' | 'dec'
  selected?: boolean
  onClick?: () => void
}) {
  const stroke = tone === 'enc' ? 'var(--color-accent)' : 'var(--color-highlight)'
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }} role={onClick ? 'button' : undefined}>
      <circle
        cx={x}
        cy={y}
        r={22}
        fill={selected ? stroke : 'var(--color-surface)'}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 1.5}
        opacity={selected ? 0.9 : 1}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill={selected ? 'var(--color-surface)' : 'var(--color-ink)'}
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}

function Line({ x1, y1, x2, y2, tone, dashed, show }: {
  x1: number
  y1: number
  x2: number
  y2: number
  tone: 'enc' | 'dec' | 'cross'
  dashed?: boolean
  show: boolean
}) {
  const color = tone === 'enc' ? 'var(--color-accent)' : tone === 'dec' ? 'var(--color-highlight)' : 'var(--color-primary-bright)'
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={1.4}
      strokeDasharray={dashed ? '4 4' : undefined}
      initial={false}
      animate={{ opacity: show ? 0.65 : 0.08 }}
      transition={{ duration: 0.3 }}
    />
  )
}

/** Cross-attention line whose strength tracks the selected decoder token. */
function CrossLine({ i, j, sel, active }: { i: number; j: number; sel: number; active: boolean }) {
  return (
    <Line
      x1={DEC_X - 24}
      y1={YS[i]}
      x2={ENC_X + 24}
      y2={YS[j]}
      tone="cross"
      dashed
      show={active && i === sel}
    />
  )
}

/** Mask grid computed from the same rule the arrows follow. */
function MaskGrid({ title, allowed, tone }: { title: string; allowed: boolean[][]; tone: 'enc' | 'dec' }) {
  const color = tone === 'enc' ? 'var(--color-accent)' : 'var(--color-highlight)'
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium text-ink-muted">{title}</div>
      <table className="border-collapse">
        <tbody>
          {allowed.map((row, i) => (
            <tr key={i}>
              {row.map((ok, j) => (
                <td key={j}>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[9px]"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: ok ? `color-mix(in srgb, ${color} 30%, transparent)` : 'transparent',
                      color: ok ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                    }}
                  >
                    {ok ? 1 : 0}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EncoderDecoderFlow() {
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selDec, setSelDec] = useState(2)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => setStage((s) => Math.min(s + 1, LAST)), 1800)
    return () => window.clearInterval(t)
  }, [playing])

  useEffect(() => {
    if (playing && stage >= LAST) setPlaying(false)
  }, [playing, stage])

  // Real masks, computed from the attention rules.
  const encMask = SRC.map(() => SRC.map(() => true))
  const decMask = DEC.map((_, i) => DEC.map((_, j) => j <= i))
  const crossMask = DEC.map(() => SRC.map(() => true))

  const show = (id: string) => STAGES.findIndex((s) => s.id === id) <= stage

  return (
    <WidgetFrame
      title="The two towers: encoder and decoder, live"
      subtitle="The 2017 architecture: bidirectional encoder attention, causal decoder self-attention, cross-attention between them. Click a decoder token to trace its view."
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Stage controls">
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          aria-label={playing ? 'Pause encoder-decoder animation' : 'Play encoder-decoder animation'}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <Button variant="ghost" onClick={() => setStage((s) => Math.max(0, s - 1))}>◀ Prev</Button>
        <Button variant="ghost" onClick={() => setStage((s) => Math.min(LAST, s + 1))}>Next ▶</Button>
        <Button variant="ghost" onClick={() => { setPlaying(false); setStage(0) }}>↺ Reset</Button>
        <span className="font-mono text-xs text-ink-muted" aria-live="polite">
          stage {stage + 1}/{STAGES.length}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Diagram */}
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised/30 p-2">
          <svg viewBox="0 0 560 230" className="min-w-105 w-full" aria-label="Encoder-decoder attention diagram">
            {/* tower labels */}
            <text x={ENC_X} y={14} textAnchor="middle" fontSize={11} fill="var(--color-ink-muted)" fontFamily="ui-monospace, monospace">
              Encoder (N layers)
            </text>
            <text x={DEC_X} y={14} textAnchor="middle" fontSize={11} fill="var(--color-ink-muted)" fontFamily="ui-monospace, monospace">
              Decoder (N layers)
            </text>

            {/* encoder bidirectional links (stage 1+) */}
            {SRC.flatMap((_, i: number) => SRC.map((_, j: number) => (i < j ? { i, j } : null)))
              .filter((p): p is { i: number; j: number } => p !== null)
              .map(({ i, j }) => (
                <Line key={`e${i}-${j}`} x1={ENC_X} y1={YS[i]} x2={ENC_X} y2={YS[j]} tone="enc" show={show('enc-attn')} />
              ))}

            {/* decoder causal links (stage 4+): i -> j for j < i, self ring for i */}
            {DEC.flatMap((_, i) => DEC.map((_, j) => (j < i ? { i, j } : null)))
              .filter((p): p is { i: number; j: number } => p !== null)
              .map(({ i, j }) => (
                <Line key={`d${i}-${j}`} x1={DEC_X} y1={YS[i]} x2={DEC_X} y2={YS[j]} tone="dec" show={show('dec-self') && selDec === i} />
              ))}

            {/* cross-attention links (stage 5+): every decoder token can reach every encoder token; the selected row is lit */}
            {DEC.flatMap((_, i) => SRC.map((_, j) => ({ i, j })))
              .map(({ i, j }) => (
                <CrossLine key={`x${i}-${j}`} i={i} j={j} sel={selDec} active={show('cross')} />
              ))}

            {/* memory band between the towers (stage 2+) */}
            <motion.g animate={{ opacity: show('memory') ? 1 : 0.15 }} initial={false} transition={{ duration: 0.3 }}>
              <rect x={215} y={90} width={130} height={50} rx={8} fill="none" stroke="var(--color-border)" strokeDasharray="5 4" />
              <text x={280} y={110} textAnchor="middle" fontSize={10} fill="var(--color-ink-muted)" fontFamily="ui-monospace, monospace">
                encoder memory
              </text>
              <text x={280} y={126} textAnchor="middle" fontSize={9} fill="var(--color-ink-muted)" fontFamily="ui-monospace, monospace">
                keys + values
              </text>
            </motion.g>

            {/* self-attention rings on decoder nodes (stage 4+) */}
            {DEC.map((_, i) =>
              show('dec-self') && selDec === i ? (
                <circle key={`self${i}`} cx={DEC_X + 30} cy={YS[i]} r={5} fill="none" stroke="var(--color-highlight)" strokeWidth={1.6} opacity={0.9} />
              ) : null,
            )}

            {/* nodes */}
            {SRC.map((t, i) => (
              <TokenNode key={t} x={ENC_X} y={YS[i]} label={t} tone="enc" selected={show('cross') && selDec === i} />
            ))}
            {DEC.map((t, i) => (
              <TokenNode
                key={t}
                x={DEC_X}
                y={YS[i]}
                label={t === '<s>' ? '⟨s⟩' : t}
                tone="dec"
                selected={show('dec-in') && selDec === i}
                onClick={() => setSelDec(i)}
              />
            ))}

            {/* output arrow (stage 6) */}
            <motion.g animate={{ opacity: show('out') ? 1 : 0.12 }} initial={false} transition={{ duration: 0.3 }}>
              <line x1={DEC_X + 24} y1={YS[2]} x2={DEC_X + 70} y2={YS[2]} stroke="var(--color-highlight)" strokeWidth={1.5} />
              <text x={DEC_X + 76} y={YS[2] + 4} fontSize={10} fill="var(--color-ink)" fontFamily="ui-monospace, monospace">
                next?
              </text>
            </motion.g>
          </svg>
        </div>

        {/* Mask grids + explanation */}
        <div className="flex flex-row gap-4 lg:w-64 lg:flex-col">
          <div className="flex flex-row gap-4">
            {show('enc-attn') && <MaskGrid title="encoder mask (all visible)" allowed={encMask} tone="enc" />}
            {show('dec-self') && <MaskGrid title="decoder self-attn mask" allowed={decMask} tone="dec" />}
            {show('cross') && <MaskGrid title="cross-attn mask" allowed={crossMask} tone="enc" />}
          </div>
          <p className="text-[11px] leading-5 text-ink-muted" aria-live="polite">
            <strong className="text-ink">{STAGES[stage].label}.</strong> {STAGES[stage].detail}
          </p>
        </div>
      </div>

      {/* Clickable decoder tokens */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Pick a decoder token to trace">
        <span className="text-xs text-ink-muted">trace decoder token:</span>
        {DEC.map((t, i) => (
          <button
            key={t + i}
            onClick={() => setSelDec(i)}
            aria-pressed={selDec === i}
            className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
              selDec === i ? 'border-highlight/60 bg-highlight/15 text-highlight' : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {t === '<s>' ? '⟨s⟩' : t}
          </button>
        ))}
        <span className="text-[11px] text-ink-muted">
          position {selDec} may self-attend to positions 0 to {selDec}, and cross-attend to all {SRC.length} source tokens
        </span>
      </div>

      {/* Output probabilities (stage 6) */}
      {show('out') && (
        <div className="mt-4 rounded-lg border border-border bg-surface-raised/30 p-3">
          <p className="mb-2 text-xs text-ink-muted">
            After "⟨s⟩ le chat", predicting the next French word (seeded logits, real softmax):
          </p>
          <ul className="space-y-1" aria-label="Next-token probabilities">
            {CANDIDATES.map((c, ci) => (
              <li key={c} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-right font-mono text-ink">{c}</span>
                <span className="relative h-3.5 flex-1 overflow-hidden rounded bg-surface">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded bg-highlight"
                    initial={false}
                    animate={{ width: `${outProbs[ci] * 100}%` }}
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 26 }}
                  />
                </span>
                <span className="w-12 shrink-0 font-mono text-ink-muted">{(outProbs[ci] * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-5 text-ink-muted">
        Three masks tell the whole family story: all-visible (encoder), lower-triangular (decoder), all-visible again
        but across towers (cross-attention). Modern chat LLMs drop the encoder and run decoder-only; translation
        models and Whisper-style systems keep the two-tower shape.
      </p>
    </WidgetFrame>
  )
}
