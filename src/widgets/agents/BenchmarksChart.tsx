/**
 * BenchmarksChart, grouped bar chart of real, published benchmark scores
 * (GPT-4 Technical Report, arXiv:2303.08774): GPT-3.5 vs GPT-4 on MMLU,
 * GSM8K, and HumanEval. Includes a plain <table> fallback for accessibility.
 */
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

const DATA = [
  { benchmark: 'MMLU (knowledge)', 'GPT-3.5': 70.0, 'GPT-4': 86.4 },
  { benchmark: 'GSM8K (math)', 'GPT-3.5': 57.1, 'GPT-4': 92.0 },
  { benchmark: 'HumanEval (code)', 'GPT-3.5': 48.1, 'GPT-4': 67.0 },
]

export function BenchmarksChart() {
  const pal = useChartTheme()
  return (
    <div className="space-y-3">
      <div role="img" aria-label="Bar chart of published benchmark scores: GPT-3.5 vs GPT-4 on MMLU (70.0 vs 86.4), GSM8K (57.1 vs 92.0), and HumanEval (48.1 vs 67.0). Higher is better.">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={DATA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={pal.grid} />
            <XAxis dataKey="benchmark" tick={{ fill: pal.tick, fontSize: 11 }} stroke={pal.axis} />
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
            />
            <Legend wrapperStyle={{ color: pal.tick, fontSize: 12 }} />
            <Bar dataKey="GPT-3.5" fill={pal.primary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="GPT-4" fill={pal.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2 text-xs">
        <summary className="cursor-pointer text-ink-muted transition hover:text-ink">
          Data table (screen-reader friendly)
        </summary>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-3 font-medium">Benchmark</th>
              <th className="py-1 pr-3 font-medium">GPT-3.5</th>
              <th className="py-1 font-medium">GPT-4</th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((d) => (
              <tr key={d.benchmark} className="border-t border-border">
                <td className="py-1 pr-3 text-ink/85">{d.benchmark}</td>
                <td className="py-1 pr-3 font-mono text-ink/85">{d['GPT-3.5'].toFixed(1)}</td>
                <td className="py-1 font-mono text-accent">{d['GPT-4'].toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="text-[11px] leading-5 text-ink-muted">
        Scores from the{' '}
        <a href="https://arxiv.org/abs/2303.08774" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          GPT-4 Technical Report
        </a>{' '}
        (MMLU 5-shot; GSM8K 5-shot CoT; HumanEval zero-shot). Same evaluation protocol, one
        generation apart, this is what "benchmark jump" looked like in 2023.
      </p>
    </div>
  )
}
