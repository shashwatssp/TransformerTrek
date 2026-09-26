/**
 * ScalingLawsChart, Chinchilla compute-optimal frontier, computed live.
 *
 * Uses the fitted law from Hoffmann et al. (2022), Table 3:
 *   L(N, D) = E + A/N^α + B/D^β,  E=1.69, A=406.4, B=410.7, α=0.34, β=0.28
 * The frontier is found numerically: for each compute budget C, minimize
 * L(N, C/(6N)) over a log-grid of N (training FLOPs ≈ 6·N·D).
 *
 * The "tokens per parameter" slider shows what happens when you deviate
 * from the Chinchilla ≈20 rule at fixed compute. Published model configs
 * (GPT-3, Gopher, Chinchilla, Llama 3) are scored through the same law.
 */
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Slider } from '../../components/ui'
import { useChartTheme } from '../../lib/chartTheme'

// Fitted constants, Hoffmann et al., "Training Compute-Optimal Large Language Models" (2022)
const E = 1.69
const A = 406.4
const B = 410.7
const ALPHA = 0.34
const BETA = 0.28

/** Chinchilla fitted parametric loss. N = params, D = training tokens. */
function law(N: number, D: number): number {
  return E + A / Math.pow(N, ALPHA) + B / Math.pow(D, BETA)
}

const C_MIN = 1e18
const C_MAX = 1e26

function fmtBig(x: number): string {
  if (x >= 1e12) return `${(x / 1e12).toFixed(1)}T`
  if (x >= 1e9) return `${(x / 1e9).toFixed(1)}B`
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)}M`
  return x.toExponential(1)
}

function fmtFlops(x: number): string {
  return `${x.toExponential(1).replace('e+', 'e')} FLOPs`
}

/** Published training configs (papers and model cards cited in the module sources). */
const MODELS = [
  { name: 'GPT-3', year: 2020, params: 175e9, tokens: 300e9, color: '#8b95a8' },
  { name: 'Gopher', year: 2021, params: 280e9, tokens: 300e9, color: '#f87171' },
  { name: 'Chinchilla', year: 2022, params: 70e9, tokens: 1.4e12, color: '#34d399' },
  { name: 'Llama 3 405B', year: 2024, params: 405e9, tokens: 15.6e12, color: '#f59e0b' },
  { name: 'DeepSeek-V3', year: 2024, params: 671e9, tokens: 14.8e12, color: '#38bdf8' },
  { name: 'Llama 4 Scout', year: 2025, params: 109e9, tokens: 40e12, color: '#a78bfa' },
  { name: 'Llama 4 Maverick', year: 2025, params: 400e9, tokens: 22e12, color: '#e879f9' },
  { name: 'Qwen3-235B', year: 2025, params: 235e9, tokens: 36e12, color: '#fb7185' },
  { name: 'Kimi K2', year: 2025, params: 1e12, tokens: 15.5e12, color: '#facc15' },
] as const

export default function ScalingLawsChart() {
  const pal = useChartTheme()
  // Compute budget on a log slider: C = 10^logC
  const [logC, setLogC] = useState(23)
  // Tokens per parameter (Chinchilla rule ≈ 20)
  const [ratio, setRatio] = useState(20)

  const C = Math.pow(10, logC)

  // Compute-optimal frontier: minimize the fitted law over a log-grid of N
  const frontier = useMemo(() => {
    const nGrid = Array.from({ length: 90 }, (_, i) => Math.pow(10, 7 + (i / 89) * 5)) // 1e7 … 1e12
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= 60; i++) {
      const c = Math.pow(10, 18 + (i / 60) * 8)
      let best = Infinity
      for (const n of nGrid) {
        const l = law(n, c / (6 * n))
        if (l < best) best = l
      }
      pts.push({ x: c, y: best })
    }
    return pts
  }, [])

  // Your point: fixed compute C, tokens-per-parameter ratio r → N = √(C/(6r)), D = r·N
  const N = Math.sqrt(C / (6 * ratio))
  const D = ratio * N
  const L = law(N, D)

  const yTicks = [1.8, 2.0, 2.5, 3.0, 3.5]
  const xTicks = [1e18, 1e20, 1e22, 1e24, 1e26]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          label="Training compute C (log scale)"
          value={logC}
          min={18}
          max={26}
          step={0.05}
          onChange={setLogC}
          format={(v) => fmtFlops(Math.pow(10, v))}
        />
        <Slider
          label="Tokens per parameter (Chinchilla rule ≈ 20)"
          value={ratio}
          min={5}
          max={60}
          step={1}
          onChange={(v) => setRatio(Math.round(v))}
          format={(v) => `${v} : 1`}
        />
      </div>

      <div className="h-[280px] w-full sm:h-[320px]" role="img" aria-label={`Log-log chart of predicted loss versus training compute. At ${fmtFlops(C)} with ${ratio} tokens per parameter: ${fmtBig(N)} parameters, ${fmtBig(D)} tokens, predicted loss ${L.toFixed(3)}. Published model dots are identified by color in the legend below the chart.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={frontier} margin={{ top: 24, right: 24, bottom: 30, left: 8 }}>
            <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              scale="log"
              domain={[C_MIN, C_MAX]}
              ticks={xTicks}
              tickFormatter={(v) => `1e${Math.log10(Number(v))}`}
              tick={{ fill: pal.tick, fontSize: 11 }}
              stroke={pal.grid}
              label={{ value: 'training compute (FLOPs, log)', position: 'insideBottom', offset: -18, fill: pal.tick, fontSize: 11 }}
              allowDataOverflow
            />
            <YAxis
              dataKey="y"
              type="number"
              scale="log"
              domain={[1.7, 3.8]}
              ticks={yTicks}
              tickFormatter={(v) => Number(v).toFixed(1)}
              tick={{ fill: pal.tick, fontSize: 11 }}
              stroke={pal.grid}
              label={{ value: 'predicted loss (log)', angle: -90, position: 'insideLeft', offset: 18, fill: pal.tick, fontSize: 11 }}
              allowDataOverflow
            />
            <Tooltip
              contentStyle={{ background: pal.tooltipBg, border: `1px solid ${pal.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: pal.tooltipText }}
              labelStyle={{ color: pal.tooltipText }}
              itemStyle={{ color: pal.tooltipText }}
              labelFormatter={(v) => `C = ${fmtFlops(Number(v))}`}
              formatter={(v) => Number(v).toFixed(3)}
            />
            <Line name="compute-optimal frontier" type="monotone" dataKey="y" stroke={pal.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {MODELS.map((m) => (
              <ReferenceDot
                key={m.name}
                x={6 * m.params * m.tokens}
                y={law(m.params, m.tokens)}
                r={5}
                fill={m.color}
                stroke={pal.tooltipBg}
              />
            ))}
            <ReferenceDot x={C} y={L} r={7} fill={pal.accent} stroke={pal.tooltipBg} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Color legend for the published-model dots (labels on the chart itself
          overlap badly once several 2025-era runs cluster on the frontier). */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend for published model dots">
        {MODELS.map((m) => (
          <span key={m.name} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            {m.name} <span className="font-mono text-[10px]">'0{m.year - 2000}</span>
          </span>
        ))}
      </div>

      {/* Live summary of the current point */}
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" aria-live="polite">
        {[
          { k: 'Compute C', v: fmtFlops(C) },
          { k: 'Params N', v: fmtBig(N) },
          { k: 'Tokens D', v: fmtBig(D) },
          { k: 'Predicted loss', v: L.toFixed(3) },
        ].map((s) => (
          <div key={s.k} className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">{s.k}</div>
            <div className="font-mono text-accent">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Published models, scored through the same law (collapsed to keep the
          widget inside one laptop screen; expand the widget for full detail) */}
      <details className="rounded-lg border border-border bg-surface-raised/30 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-ink-muted transition hover:text-ink">
          Published configs table (9 models, scored through the law)
        </summary>
        <div className="overflow-x-auto pt-2">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Published training configs and their predicted loss under the Chinchilla fitted law</caption>
          <thead>
            <tr className="bg-surface-raised/60 text-left text-xs text-ink-muted">
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Params (published)</th>
              <th className="px-3 py-2 font-medium">Tokens (published)</th>
              <th className="px-3 py-2 font-medium">Tokens/param</th>
              <th className="px-3 py-2 font-medium">Compute ≈ 6ND</th>
              <th className="px-3 py-2 font-medium">Predicted loss</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr key={m.name} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-ink/90">
                  {m.name}
                  {m.params >= 2e11 && ['DeepSeek-V3', 'Llama 4 Scout', 'Llama 4 Maverick', 'Qwen3-235B', 'Kimi K2'].includes(m.name) && (
                    <span className="ml-1.5 rounded bg-surface-raised px-1 py-0.5 font-mono text-[10px] text-ink-muted">MoE, total</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-ink/80">{fmtBig(m.params)}</td>
                <td className="px-3 py-2 font-mono text-ink/80">{fmtBig(m.tokens)}</td>
                <td className="px-3 py-2 font-mono text-ink/80">{(m.tokens / m.params).toFixed(1)}</td>
                <td className="px-3 py-2 font-mono text-ink/80">{fmtFlops(6 * m.params * m.tokens)}</td>
                <td className="px-3 py-2 font-mono text-accent">{law(m.params, m.tokens).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>

      <p className="text-xs text-ink-muted">
        All numbers are computed in your browser from the fitted constants E=1.69, A=406.4, B=410.7, α=0.34, β=0.28 of{' '}
        <a href="https://arxiv.org/abs/2203.15556" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
          Hoffmann et al., 2022
        </a>;
        predictions from a 2022-era fit, not measured losses (modern models beat this prediction thanks to better data
        and stability tricks). Published params/tokens are from each model's paper or card; MoE rows (DeepSeek-V3, Llama
        4, Qwen3, Kimi K2) count total parameters, and 2025-era models deliberately over-train far past ≈20 tokens per
        param, so their dots sit slightly off the 2022 frontier. Slide tokens/param away from ≈20 at fixed compute and
        watch the point rise off the frontier.
      </p>
    </div>
  )
}
