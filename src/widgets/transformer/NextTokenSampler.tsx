import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Button, Slider, WidgetFrame } from '../../components/ui'
import { sampleFrom, seededRandom, softmax, topK, topP } from '../../lib/math'

export type SamplerCandidate = { token: string; logit: number }

export type SamplerPreset = {
  label: string
  prompt: string
  candidates: SamplerCandidate[]
}

const DEFAULT_PRESETS: SamplerPreset[] = [
  {
    label: 'The cat sat on the …',
    prompt: 'The cat sat on the',
    candidates: [
      { token: ' mat', logit: 3.4 },
      { token: ' floor', logit: 2.7 },
      { token: ' roof', logit: 1.5 },
      { token: ' table', logit: 1.2 },
      { token: ' grass', logit: 0.7 },
      { token: ' moon', logit: -1.9 },
      { token: ' quantum', logit: -3.6 },
    ],
  },
  {
    label: 'Paris is the capital of …',
    prompt: 'Paris is the capital of',
    candidates: [
      { token: ' France', logit: 4.6 },
      { token: ' Europe', logit: 1.9 },
      { token: ' the', logit: 1.1 },
      { token: ' Germany', logit: -0.6 },
      { token: ' banana', logit: -4.2 },
    ],
  },
]

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}

/**
 * Baked-logit next-token sampler: temperature → top-k → top-p → renormalize,
 * with probability bars and optional seeded sampling. Every displayed number
 * is computed in the browser from the visible logits.
 */
export function NextTokenSampler({
  presets = DEFAULT_PRESETS,
  showTemperature = true,
  showTopK = true,
  showTopP = true,
  showSampling = true,
  title = 'Next-token sampler',
  subtitle,
}: {
  presets?: SamplerPreset[]
  showTemperature?: boolean
  showTopK?: boolean
  showTopP?: boolean
  showSampling?: boolean
  title?: string
  subtitle?: string
}) {
  const [presetIdx, setPresetIdx] = useState(0)
  const [temperature, setTemperature] = useState(1)
  const [k, setK] = useState(4)
  const [p, setP] = useState(0.9)
  const [seed, setSeed] = useState(1)
  const [sampledIdx, setSampledIdx] = useState<number | null>(null)
  const reduced = useReducedMotion()

  const preset = presets[presetIdx]
  const n = preset.candidates.length
  const logits = preset.candidates.map((c) => c.logit)
  const kEff = Math.min(k, n)

  // Pipeline: temperature-softmax → top-k filter → top-p filter → renormalize.
  const probs = softmax(logits, temperature)
  const kSet = new Set(topK(logits, kEff))
  const nucleus = new Set(topP(probs, p))
  const allowed = probs.map((_, i) => kSet.has(i) && nucleus.has(i))
  const keptSum = probs.reduce((acc, pr, i) => acc + (allowed[i] ? pr : 0), 0)
  const final = probs.map((pr, i) => (allowed[i] ? pr / (keptSum || 1) : 0))
  const argmaxIdx = logits.indexOf(Math.max(...logits))

  const roll = () => {
    const rand = seededRandom(seed)
    setSampledIdx(sampleFrom(final, rand))
    setSeed((s) => s + 1)
  }

  const choosePreset = (idx: number) => {
    setPresetIdx(idx)
    setK(Math.min(k, presets[idx].candidates.length))
    setSampledIdx(null)
  }

  return (
    <WidgetFrame
      title={title}
      subtitle={subtitle ?? 'Baked logits → temperature → top-k → top-p. Every number below is computed live in your browser.'}
    >
      {/* Prompt picker */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a prompt">
        {presets.map((pr, i) => (
          <button
            key={pr.label}
            onClick={() => choosePreset(i)}
            aria-pressed={presetIdx === i}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              presetIdx === i
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {pr.label}
          </button>
        ))}
      </div>

      <p className="mt-3 font-mono text-sm text-ink">
        {preset.prompt}
        <span className="ml-1 inline-block rounded border border-dashed border-highlight px-2 text-highlight">?</span>
      </p>

      {/* Controls */}
      <div className={`mt-4 grid gap-4 ${showTopK && showTopP ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {showTemperature && (
          <Slider
            label="Temperature (T)"
            value={temperature}
            min={0.1}
            max={2}
            step={0.05}
            onChange={(v) => setTemperature(v)}
            format={(v) => v.toFixed(2)}
          />
        )}
        {showTopK && (
          <Slider
            label="Top-k (keep k tokens)"
            value={kEff}
            min={1}
            max={n}
            step={1}
            onChange={(v) => setK(v)}
            format={(v) => String(Math.min(Math.round(v), n))}
          />
        )}
        {showTopP && (
          <Slider
            label="Top-p (nucleus mass)"
            value={p}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(v) => setP(v)}
            format={(v) => v.toFixed(2)}
          />
        )}
      </div>

      {/* Candidate table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-xs" aria-label={`Candidate next tokens for “${preset.prompt}”`}>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="py-1.5 pr-2 font-medium">candidate</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">logit</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">p after T</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">final p</th>
              <th scope="col" className="py-1.5 font-medium">probability</th>
            </tr>
          </thead>
          <tbody>
            {preset.candidates.map((c, i) => {
              const cutByK = !kSet.has(i)
              const cutByP = !nucleus.has(i)
              const cut = cutByK || cutByP
              return (
                <tr key={c.token} className={`border-t border-border/60 transition-colors ${sampledIdx === i ? 'bg-highlight/10' : ''}`}>
                  <td className="py-1.5 pr-2 font-mono text-ink">
                    {sampledIdx === i && (
                      <motion.span
                        aria-hidden
                        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                        className="mr-1 inline-block text-highlight"
                      >
                        ▶
                      </motion.span>
                    )}
                    {argmaxIdx === i && <span aria-hidden className="mr-1 text-success" title="greedy pick (argmax)">★</span>}
                    {c.token}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-ink-muted">{c.logit.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 font-mono text-ink-muted">{pct(probs[i])}</td>
                  <td className={`py-1.5 pr-2 font-mono ${cut ? 'text-ink-muted line-through' : 'text-accent'}`}>{pct(final[i])}</td>
                  <td className="py-1.5">
                    <div className="relative h-4 w-full max-w-[240px] overflow-hidden rounded bg-surface-raised">
                      <motion.div
                        className={`h-full rounded ${cut ? 'bg-border' : 'bg-accent'}`}
                        initial={false}
                        animate={{ width: `${Math.max(final[i] * 100, final[i] > 0 ? 2 : 0)}%` }}
                        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 26 }}
                      />
                    </div>
                    {cut && (
                      <span className="ml-1 font-mono text-[10px] text-danger">
                        cut by {cutByK ? 'top-k' : 'top-p'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sampling */}
      {showSampling && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button onClick={roll} variant="primary">Sample a token</Button>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {sampledIdx === null ? (
              <>Draw one token from the final distribution (seeded, reproducible per click).</>
            ) : (
              <>
                Sampled:
                <motion.span
                  key={sampledIdx}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  className="ml-1 inline-block rounded bg-highlight/15 px-2 py-0.5 font-mono text-highlight"
                >
                  {preset.candidates[sampledIdx].token}
                </motion.span>
              </>
            )}
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-5 text-ink-muted">
        ★ marks the greedy pick (argmax). Pipeline order: divide logits by T → softmax → keep top-k
        → keep the top-p nucleus → renormalize what survives. Filtering happens before sampling, so
        cut tokens can never be drawn.
      </p>
    </WidgetFrame>
  )
}
