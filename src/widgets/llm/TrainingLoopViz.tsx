/**
 * TrainingLoopViz, an animated, fully client-side simulated training run.
 *
 * Left panel:  loss vs step, following a stylized power-law descent
 *              (the shape real pretraining runs show) + seeded noise.
 * Right panel: the learning-rate schedule, genuinely computed warmup +
 *              cosine decay from the slider inputs.
 *
 * Every displayed number is computed in the browser. The RNG is seeded
 * (src/lib/math), so the run is reproducible.
 */
import { useEffect, useMemo, useState } from 'react'
import { Slider } from '../../components/ui'
import { gaussian, seededRandom } from '../../lib/math'
import { useChartTheme } from '../../lib/chartTheme'

const TOTAL = 1200 // simulated optimizer steps
const TOK_PER_STEP = 1_000_000 // 1M tokens per step
const PARAMS = 124_000_000 // a GPT-2-small-class model

// Stylized loss model: L(t) = L_INF + (L0 − L_INF) · (1 + t/TAU)^(−ALPHA) + ε
const L0 = 8.8
const L_INF = 2.55
const TAU = 90
const ALPHA = 0.62
const NOISE = 0.045

// Cosine floor: decay to 5% of peak instead of 0 (common in practice).
const MIN_LR_RATIO = 0.05

// Chart geometry (viewBox units)
const W = 340
const H = 170
const PAD = 34

function lrSchedule(t: number, peak: number, warmup: number): number {
  if (t <= warmup) return peak * (t / warmup)
  const p = (t - warmup) / Math.max(1, TOTAL - warmup)
  return peak * (MIN_LR_RATIO + (1 - MIN_LR_RATIO) * 0.5 * (1 + Math.cos(Math.PI * p)))
}

function pathOf(pts: readonly (readonly [number, number])[], xMax: number, yMin: number, yMax: number): string {
  return pts
    .map(([t, v], i) => {
      const x = PAD + (t / xMax) * (W - 2 * PAD)
      const y = H - PAD - ((v - yMin) / (yMax - yMin)) * (H - 2 * PAD)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function ChartCard({
  title,
  ariaLabel,
  children,
}: {
  title: string
  ariaLabel: string
  children: React.ReactNode
}) {
  const pal = useChartTheme()
  return (
    <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
      <div className="mb-1 text-xs font-medium text-ink-muted">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
        {/* plot frame */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke={pal.ghost} strokeWidth={1} />
        {children}
      </svg>
    </div>
  )
}

export default function TrainingLoopViz() {
  const pal = useChartTheme()
  const [warmupFrac, setWarmupFrac] = useState(0.06)
  const [logPeak, setLogPeak] = useState(-3.5) // peak LR = 10^logPeak
  const [cur, setCur] = useState(0)
  const [playing, setPlaying] = useState(false)

  const warmup = Math.max(1, Math.round(warmupFrac * TOTAL))
  const peak = Math.pow(10, logPeak)

  // Deterministic loss curve: power-law descent + seeded Gaussian noise
  const curve = useMemo(() => {
    const rand = seededRandom(7)
    return Array.from({ length: TOTAL + 1 }, (_, t) => {
      const base = L_INF + (L0 - L_INF) * Math.pow(1 + t / TAU, -ALPHA)
      return base + gaussian(rand) * NOISE
    })
  }, [])

  const yMin = Math.min(...curve) - 0.25
  const yMax = Math.max(...curve) + 0.25
  const yTop = peak * 1.08

  const fullLoss = curve.map((l, t) => [t, l] as const)
  const seenLoss = fullLoss.slice(0, cur + 1)

  const fullLr = Array.from({ length: TOTAL + 1 }, (_, t) => [t, lrSchedule(t, peak, warmup)] as const)
  const seenLr = fullLr.slice(0, cur + 1)

  const curLoss = curve[cur]
  const curLr = lrSchedule(cur, peak, warmup)
  const tokensB = (cur * TOK_PER_STEP) / 1e9
  const tokensPerParam = (cur * TOK_PER_STEP) / PARAMS

  // Advance the run while playing
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setCur((c) => Math.min(c + 5, TOTAL))
    }, 32)
    return () => window.clearInterval(id)
  }, [playing])

  useEffect(() => {
    if (cur >= TOTAL) setPlaying(false)
  }, [cur])

  const lossX = (t: number) => PAD + (t / TOTAL) * (W - 2 * PAD)
  const lossY = (v: number) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - 2 * PAD)
  const lrY = (v: number) => H - PAD - (v / yTop) * (H - 2 * PAD)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard
          title="Loss vs step (simulated)"
          ariaLabel={`Simulated training loss over ${TOTAL} steps. Current step ${cur}, loss ${curLoss.toFixed(3)}.`}
        >
          <path d={pathOf(fullLoss, TOTAL, yMin, yMax)} fill="none" stroke={pal.ghost} strokeWidth={1.5} />
          <path d={pathOf(seenLoss, TOTAL, yMin, yMax)} fill="none" stroke={pal.accent} strokeWidth={2} />
          <circle cx={lossX(cur)} cy={lossY(curLoss)} r={4} fill={pal.accent} />
          <text x={PAD + 4} y={PAD + 12} fontSize={10} fill={pal.muted} fontFamily="monospace">
            {yMax.toFixed(1)}
          </text>
          <text x={PAD + 4} y={H - PAD - 4} fontSize={10} fill={pal.muted} fontFamily="monospace">
            {yMin.toFixed(1)}
          </text>
          <text x={W - PAD - 4} y={H - 8} fontSize={10} fill={pal.muted} textAnchor="end">
            step {TOTAL} →
          </text>
        </ChartCard>

        <ChartCard
          title="Learning rate vs step (computed)"
          ariaLabel={`Learning-rate schedule over ${TOTAL} steps: linear warmup for ${warmup} steps, then cosine decay. Current LR ${curLr.toExponential(2)}.`}
        >
          <path d={pathOf(fullLr, TOTAL, 0, yTop)} fill="none" stroke={pal.ghost} strokeWidth={1.5} />
          <path d={pathOf(seenLr, TOTAL, 0, yTop)} fill="none" stroke={pal.highlight} strokeWidth={2} />
          <circle cx={lossX(cur)} cy={lrY(curLr)} r={4} fill={pal.highlight} />
          <text x={PAD + 4} y={PAD + 12} fontSize={10} fill={pal.muted} fontFamily="monospace">
            peak {peak.toExponential(1)}
          </text>
          <text x={PAD + 4} y={H - PAD - 4} fontSize={10} fill={pal.muted} fontFamily="monospace">
            0
          </text>
          <text x={W - PAD - 4} y={H - 8} fontSize={10} fill={pal.muted} textAnchor="end">
            step {TOTAL} →
          </text>
        </ChartCard>
      </div>

      {/* Live readouts, also the accessible summary of the animated state */}
      <p aria-live="polite" className="text-sm text-ink/85">
        Step <span className="font-mono text-accent">{cur}</span> · LR{' '}
        <span className="font-mono text-highlight">{curLr.toExponential(2)}</span> · loss{' '}
        <span className="font-mono text-accent">{curLoss.toFixed(3)}</span> · tokens seen{' '}
        <span className="font-mono text-accent">{tokensB.toFixed(2)}B</span> · tokens/param{' '}
        <span className="font-mono text-accent">{tokensPerParam.toFixed(1)}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause the training simulation' : 'Play the training simulation'}
            className="w-fit rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setCur(0)
            }}
            aria-label="Restart the training simulation from step zero"
            className="w-fit rounded-lg border border-border px-3 py-1.5 text-sm text-ink transition hover:bg-surface-raised"
          >
            ↺ Reset
          </button>
        </div>
        <Slider
          label="Scrub step"
          value={cur}
          min={0}
          max={TOTAL}
          step={1}
          onChange={(v) => {
            setPlaying(false)
            setCur(v)
          }}
          format={(v) => String(v)}
        />
        <Slider
          label="Warmup (fraction of run)"
          value={warmupFrac}
          min={0.01}
          max={0.25}
          step={0.01}
          onChange={setWarmupFrac}
          format={(v) => `${(v * 100).toFixed(0)}% (${Math.round(v * TOTAL)} steps)`}
        />
      </div>
      <Slider
        label="Peak learning rate (log scale)"
        value={logPeak}
        min={-4}
        max={-3}
        step={0.02}
        onChange={(v) => {
          setLogPeak(v)
        }}
        format={(v) => Math.pow(10, v).toExponential(2)}
      />

      <p className="text-xs text-ink-muted">
        Simulated run: loss follows L(t) = L∞ + (L₀−L∞)·(1+t/τ)<sup>−α</sup> + ε with L∞=2.55, L₀=8.8, τ=90, α=0.62 and
        seeded Gaussian noise ε, the power-law shape real runs show. The LR panel is the exact schedule computed from
        your sliders: linear warmup, then cosine decay to {Math.round(MIN_LR_RATIO * 100)}% of peak. At {TOTAL} steps ×
        1M tokens/step this run sees {(TOTAL * TOK_PER_STEP) / 1e9}B tokens on a {PARAMS / 1e6}M-parameter model, a
        tokens-per-parameter ratio of {((TOTAL * TOK_PER_STEP) / PARAMS).toFixed(1)}.
      </p>
    </div>
  )
}
