/**
 * BenchmarksChart, head-to-head model comparison.
 *
 * Pick any two models (2023 originals through the September 2026 flagships)
 * and compare them across seven ability axes: knowledge (MMLU), vision (MMMU),
 * science reasoning (GPQA Diamond), competition math (AIME), real-world coding
 * (SWE-bench Verified), agentic work (Terminal-Bench 2.1) and frontier
 * reasoning (Humanity's Last Exam, no tools).
 *
 * Sourcing honesty: scores mix vendor-reported and independent (vals.ai,
 * Epoch AI, swebench.com) numbers, and harness/effort settings move results
 * by several points. Treat gaps under ~5 points as noise. Snapshot: Sep 2026.
 * A plain <table> fallback keeps the data accessible.
 */
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartTheme } from '../../lib/chartTheme'

type ScoreKey = 'mmlu' | 'mmmu' | 'gpqa' | 'aime' | 'swe' | 'tbench' | 'hle'

type ModelRow = {
  id: string
  name: string
  org: string
  year: number
  open: boolean
  scores: Partial<Record<ScoreKey, number>>
}

const MODELS: ModelRow[] = [
  // ── 2023–2024: the pre-reasoning era ─────────────────────────
  { id: 'gpt-3.5', name: 'GPT-3.5', org: 'OpenAI', year: 2022, open: false, scores: { mmlu: 70.0, gpqa: 27.5 } },
  { id: 'gpt-4', name: 'GPT-4', org: 'OpenAI', year: 2023, open: false, scores: { mmlu: 86.4, gpqa: 31.2, aime: 12.5 } },
  { id: 'gpt-4o', name: 'GPT-4o', org: 'OpenAI', year: 2024, open: false, scores: { mmlu: 88.7, gpqa: 49.0, swe: 38.8, mmmu: 69.1, hle: 2.7 } },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', org: 'Anthropic', year: 2024, open: false, scores: { mmlu: 90.4, gpqa: 55.0, swe: 49.0, mmmu: 70.4, hle: 4.1 } },
  { id: 'o1', name: 'o1', org: 'OpenAI', year: 2024, open: false, scores: { mmlu: 91.8, gpqa: 75.7, aime: 79.2, swe: 48.9, hle: 8.0 } },
  // ── 2025: reasoning models + open weights catch up ──────────
  { id: 'ds-r1', name: 'DeepSeek-R1', org: 'DeepSeek', year: 2025, open: true, scores: { mmlu: 90.8, gpqa: 71.5, aime: 79.8, swe: 49.2 } },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', org: 'Google', year: 2025, open: false, scores: { gpqa: 85.0, swe: 63.8 } },
  { id: 'opus-4', name: 'Claude Opus 4', org: 'Anthropic', year: 2025, open: false, scores: { mmlu: 92.9, gpqa: 74.9, swe: 72.5 } },
  { id: 'sonnet-4.5', name: 'Claude Sonnet 4.5', org: 'Anthropic', year: 2025, open: false, scores: { gpqa: 74.0, swe: 77.2 } },
  { id: 'gpt-5', name: 'GPT-5', org: 'OpenAI', year: 2025, open: false, scores: { gpqa: 85.0, swe: 74.9 } },
  { id: 'kimi-k2', name: 'Kimi K2', org: 'Moonshot', year: 2025, open: true, scores: { mmlu: 89.5, gpqa: 75.1, aime: 49.5, swe: 65.8 } },
  { id: 'qwen3-235b', name: 'Qwen3-235B-A22B', org: 'Alibaba', year: 2025, open: true, scores: { aime: 81.5 } },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', org: 'Google', year: 2025, open: false, scores: { gpqa: 91.9, swe: 76.2, mmmu: 81.0, hle: 37.5 } },
  // ── 2026: the current frontier ───────────────────────────────
  { id: 'opus-4.6', name: 'Claude Opus 4.6', org: 'Anthropic', year: 2026, open: false, scores: { gpqa: 91.3, aime: 99.8, swe: 80.8, hle: 40.0 } },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', org: 'Google', year: 2026, open: false, scores: { gpqa: 94.3, aime: 91.2, swe: 80.6, mmmu: 81.0, tbench: 68.5, hle: 44.4 } },
  { id: 'gpt-5.4', name: 'GPT-5.4', org: 'OpenAI', year: 2026, open: false, scores: { gpqa: 92.8, aime: 100, mmmu: 81.2, hle: 41.6 } },
  { id: 'ds-v4-pro', name: 'DeepSeek-V4-Pro', org: 'DeepSeek', year: 2026, open: true, scores: { gpqa: 90.1, swe: 80.6 } },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', org: 'Moonshot', year: 2026, open: true, scores: { gpqa: 90.5, swe: 80.2 } },
  { id: 'fable-5', name: 'Claude Fable 5', org: 'Anthropic', year: 2026, open: false, scores: { gpqa: 93.2, swe: 95.0 } },
  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', org: 'OpenAI', year: 2026, open: false, scores: { gpqa: 94.6, swe: 96.2, mmmu: 83.0, tbench: 85.8 } },
  { id: 'opus-5', name: 'Claude Opus 5', org: 'Anthropic', year: 2026, open: false, scores: { gpqa: 93.4, swe: 96.0, tbench: 84.6 } },
  { id: 'kimi-k3', name: 'Kimi K3', org: 'Moonshot', year: 2026, open: true, scores: { gpqa: 92.9, swe: 93.4, tbench: 80.9 } },
  { id: 'grok-4.6', name: 'Grok 4.6', org: 'xAI', year: 2026, open: false, scores: { gpqa: 94.7, swe: 95.6 } },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', org: 'Google', year: 2026, open: false, scores: { gpqa: 95.3, tbench: 81.3, hle: 47.8 } },
  { id: 'gpt6-astra', name: 'GPT-6 Astra', org: 'OpenAI', year: 2026, open: false, scores: { gpqa: 96.0, tbench: 87.3 } },
]

const ABILITIES: { key: ScoreKey; short: string; label: string }[] = [
  { key: 'mmlu', short: 'MMLU', label: 'MMLU (broad knowledge)' },
  { key: 'mmmu', short: 'MMMU', label: 'MMMU / MMMU-Pro (vision)' },
  { key: 'gpqa', short: 'GPQA-D', label: 'GPQA Diamond (science reasoning)' },
  { key: 'aime', short: 'AIME', label: 'AIME (competition math)' },
  { key: 'swe', short: 'SWE-V', label: 'SWE-bench Verified (real-world coding)' },
  { key: 'tbench', short: 'TBench', label: 'Terminal-Bench 2.1 (agentic terminal work)' },
  { key: 'hle', short: 'HLE', label: "Humanity's Last Exam, no tools (frontier reasoning)" },
]

const COHORTS: { label: string; from: number; to: number }[] = [
  { label: '2026 flagships', from: 2026, to: 2026 },
  { label: '2025', from: 2025, to: 2025 },
  { label: '2023–2024 (the old guard)', from: 2022, to: 2024 },
]

const PRESETS: { label: string; a: string; b: string }[] = [
  { label: 'Frontier today', a: 'gpt6-astra', b: 'opus-5' },
  { label: 'Open weights vs closed', a: 'kimi-k3', b: 'gpt-5.6-sol' },
  { label: '2023 throwback: GPT-3.5 vs GPT-4', a: 'gpt-3.5', b: 'gpt-4' },
]

function byId(id: string): ModelRow {
  const m = MODELS.find((x) => x.id === id)
  return m ?? MODELS[MODELS.length - 1]
}

/** Native select styled to the app tokens, with era optgroups. */
function ModelSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (id: string) => void
  ariaLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="w-full min-h-9 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-ink transition focus:border-accent focus:outline-none"
    >
      {COHORTS.map((c) => (
        <optgroup key={c.label} label={c.label}>
          {MODELS.filter((m) => m.year >= c.from && m.year <= c.to).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.org} · {m.year}
              {m.open ? ' · open' : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export function BenchmarksChart() {
  const pal = useChartTheme()
  const [aId, setAId] = useState('gpt6-astra')
  const [bId, setBId] = useState('opus-5')
  const a = byId(aId)
  const b = byId(bId)
  const same = a.id === b.id

  // One row per ability where at least one of the two models has a score.
  const data = ABILITIES.filter((ab) => a.scores[ab.key] != null || b.scores[ab.key] != null).map(
    (ab) => ({
      ability: ab.short,
      full: ab.label,
      a: a.scores[ab.key] ?? null,
      b: b.scores[ab.key] ?? null,
    }),
  )

  const seriesLabel = (m: ModelRow) => `${m.name}${m.open ? ' (open)' : ''}`

  return (
    <div className="space-y-3">
      {/* Model pickers */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <ModelSelect value={aId} onChange={setAId} ariaLabel="Model A" />
        <button
          onClick={() => {
            setAId(bId)
            setBId(aId)
          }}
          aria-label="Swap models"
          title="Swap models"
          className="mx-auto min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted transition hover:border-accent/50 hover:text-accent"
        >
          ⇄
        </button>
        <ModelSelect value={bId} onChange={setBId} ariaLabel="Model B" />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Comparison presets">
        {PRESETS.map((p) => {
          const active = (aId === p.a && bId === p.b) || (aId === p.b && bId === p.a)
          return (
            <button
              key={p.label}
              onClick={() => {
                setAId(p.a)
                setBId(p.b)
              }}
              aria-pressed={active}
              className={`min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'border-accent/60 bg-accent/10 text-accent'
                  : 'border-border text-ink-muted hover:border-accent/40 hover:text-accent'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {same ? (
        <p className="rounded-lg border border-highlight/40 bg-highlight/5 px-3 py-2 text-sm text-ink">
          Pick two different models to compare head-to-head.
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Grouped bar chart comparing ${a.name} and ${b.name} across ${data.length} benchmark${data.length === 1 ? '' : 's'}. Higher is better.`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={pal.grid} />
                <XAxis dataKey="ability" tick={{ fill: pal.tick, fontSize: 11 }} stroke={pal.axis} />
                <YAxis domain={[0, 100]} tick={{ fill: pal.tick, fontSize: 11 }} stroke={pal.axis} unit="%" />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                  contentStyle={{
                    background: pal.tooltipBg,
                    border: `1px solid ${pal.tooltipBorder}`,
                    borderRadius: 8,
                    color: pal.tooltipText,
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
                />
                <Legend wrapperStyle={{ color: pal.tick, fontSize: 12 }} />
                <Bar dataKey="a" name={seriesLabel(a)} fill={pal.accent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="b" name={seriesLabel(b)} fill={pal.highlight} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-ability verdicts */}
          <ul className="grid gap-1.5 text-xs sm:grid-cols-2" aria-label="Per-benchmark leader">
            {data.map((d) => {
              const ab = ABILITIES.find((x) => x.short === d.ability)!
              const va = d.a
              const vb = d.b
              const gap = va != null && vb != null ? Math.abs(va - vb) : null
              const leader =
                va != null && vb != null ? (va > vb ? a : b) : va != null ? a : vb != null ? b : null
              return (
                <li key={d.ability} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised/30 px-2.5 py-1.5">
                  <span className="min-w-0 truncate text-ink-muted" title={ab.label}>{ab.label}</span>
                  <span className="shrink-0 font-mono text-ink/85">
                    {va != null ? `${va.toFixed(1)}%` : '—'} vs {vb != null ? `${vb.toFixed(1)}%` : '—'}
                  </span>
                  {leader && gap != null && gap >= 5 ? (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
                      {leader.name} +{gap.toFixed(0)}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-ink-muted">
                      {gap != null ? '≈ tie' : 'no data'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          <details className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2 text-xs">
            <summary className="cursor-pointer text-ink-muted transition hover:text-ink">
              Data table (screen-reader friendly)
            </summary>
            <table className="mt-2 w-full border-collapse text-left">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 pr-3 font-medium">Benchmark</th>
                  <th className="py-1 pr-3 font-medium">{seriesLabel(a)}</th>
                  <th className="py-1 font-medium">{seriesLabel(b)}</th>
                </tr>
              </thead>
              <tbody>
                {ABILITIES.map((ab) => (
                  <tr key={ab.key} className="border-t border-border">
                    <td className="py-1 pr-3 text-ink/85">{ab.label}</td>
                    <td className="py-1 pr-3 font-mono text-ink/85">
                      {a.scores[ab.key] != null ? a.scores[ab.key]!.toFixed(1) : '—'}
                    </td>
                    <td className="py-1 font-mono text-accent">
                      {b.scores[ab.key] != null ? b.scores[ab.key]!.toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}

      <p className="text-[11px] leading-5 text-ink-muted">
        Snapshot September 2026. Sources: the{' '}
        <a href="https://arxiv.org/abs/2303.08774" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          GPT-4 Technical Report
        </a>{' '}
        and DeepSeek-R1, Kimi K2, Gemini and Claude model cards for vendor-reported scores;{' '}
        <a href="https://www.swebench.com" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          swebench.com
        </a>
        , vals.ai and Epoch AI for independent runs. AIME rows mix 2024 and 2025 editions (noted where it matters);
        post-2025 labs mostly stopped reporting MMLU (saturated). Scores mix vendor-reported and independently measured
        results, and harness/effort settings move numbers by several points, so treat gaps under ~5 points as noise.
        Blank cells mean no comparable published result, not zero. Selecting older models is deliberate: compare
        GPT-4 (2023) against GPT-6 Astra (2026) to see three years of frontier progress in one picture.
      </p>
    </div>
  )
}
