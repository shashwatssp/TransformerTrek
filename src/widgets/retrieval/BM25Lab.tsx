/**
 * BM25Lab, a live BM25 workbench over a six-document astronomy corpus.
 * Rankings, per-term breakdowns, and the TF-saturation curve all recompute
 * from the k1/b sliders using src/lib/bm25.ts (Lucene-style IDF).
 */
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Slider } from '../../components/ui'
import { buildIndex, idf, scoreAll, saturationCurve } from '../../lib/bm25'
import { useChartTheme } from '../../lib/chartTheme'
import { Pill } from './shared'

type Doc = { id: string; title: string; text: string }

const DOCS: Doc[] = [
  {
    id: 'd1',
    title: 'Neutron stars',
    text: 'A neutron star is the collapsed core of a massive star. A neutron star packs more mass than the Sun into a city-sized sphere.',
  },
  {
    id: 'd2',
    title: 'Black holes',
    text: 'A black hole forms when a massive star collapses under gravity. Nothing escapes a black hole, not even light.',
  },
  {
    id: 'd3',
    title: 'Pulsars',
    text: 'A pulsar is a spinning neutron star that beams radiation like a lighthouse. Pulsars are detected as periodic radio pulses.',
  },
  {
    id: 'd4',
    title: 'White dwarfs',
    text: 'A white dwarf is the leftover core of a sun-like star. It is dense, but far less dense than a neutron star.',
  },
  {
    id: 'd5',
    title: 'The Sun',
    text: 'The Sun is an ordinary main-sequence star powered by hydrogen fusion, slowly swelling toward its red giant phase.',
  },
  {
    id: 'd6',
    title: 'Space telescopes',
    text: 'Space telescopes observe star light across the spectrum, from infrared to X-ray, above the blurring atmosphere.',
  },
]

const PRESETS = ['neutron star', 'dense star core', 'black hole light', 'spinning pulsar beams']

const CURVE_F_SAMPLES = [1, 3, 6, 12]

export default function BM25Lab() {
  const pal = useChartTheme()
  const [query, setQuery] = useState('neutron star')
  const [k1, setK1] = useState(1.2)
  const [b, setB] = useState(0.75)

  const index = useMemo(() => buildIndex(DOCS), [])
  const results = useMemo(() => scoreAll(index, query, k1, b), [index, k1, b])
  const top = results[0]

  const curve = useMemo(() => {
    const short = saturationCurve(k1, b, 0.6)
    const long = saturationCurve(k1, b, 1.8)
    return short.map((p, i) => ({ f: p.f, short: p.y, long: long[i].y }))
  }, [k1, b])

  return (
    <div className="space-y-4 text-sm">
      {/* Query controls */}
      <div className="space-y-2">
        <label htmlFor="bm25-query" className="block text-xs font-medium text-ink-muted">
          Query
        </label>
        <input
          id="bm25-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preset queries">
          {PRESETS.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              aria-pressed={query === q}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                query === q ? 'border-accent/60 bg-accent/10 text-accent' : 'border-border text-ink-muted hover:text-ink'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="k1, term-frequency saturation" value={k1} min={0} max={2.5} step={0.05} onChange={setK1} />
        <Slider label="b, length normalization" value={b} min={0} max={1} step={0.05} onChange={setB} />
      </div>

      {/* Rankings */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Rankings</span>
          <Pill>corpus: {DOCS.length} docs</Pill>
          <Pill>avgdl: {index.avgdl.toFixed(1)} tokens</Pill>
        </div>
        <ol className="space-y-1.5">
          {results.map((r, i) => (
            <li
              key={r.doc.id}
              className={`flex items-center gap-3 rounded-md border px-2.5 py-1.5 ${
                i === 0 ? 'border-accent/50 bg-accent/10' : 'border-border bg-surface'
              }`}
            >
              <span className="font-mono text-xs text-ink-muted">#{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink/85">{r.doc.title}</span>
              <span className="font-mono text-xs text-ink">{r.score.toFixed(3)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Top-doc breakdown */}
      {top && top.score > 0 && (
        <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
          <div className="mb-2 text-xs font-semibold text-ink">
            Why “{top.doc.title}” wins, per-term contributions
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
            <caption className="sr-only">BM25 term contributions for the top-ranked document</caption>
            <thead>
              <tr className="text-ink-muted">
                <th className="py-1 pr-3 font-medium">term</th>
                <th className="py-1 pr-3 font-medium">freq</th>
                <th className="py-1 pr-3 font-medium">idf</th>
                <th className="py-1 pr-3 font-medium">tf-part</th>
                <th className="py-1 font-medium">idf × tf-part</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {top.breakdown.map((t) => (
                <tr key={t.term} className="border-t border-border">
                  <td className="py-1 pr-3 text-accent">{t.term}</td>
                  <td className="py-1 pr-3 text-ink/80">{t.freq}</td>
                  <td className="py-1 pr-3 text-ink/80">{t.idf.toFixed(3)}</td>
                  <td className="py-1 pr-3 text-ink/80">{t.tfNorm.toFixed(3)}</td>
                  <td className="py-1 font-semibold text-ink">{t.contribution.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saturation curve */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Term-frequency saturation, the k1 knob, live
        </div>
        <div role="img" aria-label={`Line chart of the BM25 term-frequency component for term frequency 0 to 12. Short documents (length 0.6 times average) start higher; long documents (1.8 times average) start lower. Both saturate toward k1 plus one, which is ${(k1 + 1).toFixed(2)} at the current k1.`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
              <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
              <XAxis dataKey="f" type="number" domain={[0, 12]} tick={{ fill: pal.tick, fontSize: 11 }} stroke={pal.grid} />
              <YAxis domain={[0, k1 + 1]} tick={{ fill: pal.tick, fontSize: 11 }} stroke={pal.grid} />
              <Tooltip
                contentStyle={{ background: pal.tooltipBg, border: `1px solid ${pal.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: pal.tooltipText }}
                labelStyle={{ color: pal.tick }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="short" name="short doc (0.6× avgdl)" stroke={pal.accent} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="long" name="long doc (1.8× avgdl)" stroke={pal.highlight} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-2 w-full text-left text-xs">
          <caption className="sr-only">Sample values of the term-frequency component</caption>
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-3 font-medium">term freq f</th>
              {CURVE_F_SAMPLES.map((f) => (
                <th key={f} className="py-1 pr-3 font-mono font-medium">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr>
              <td className="py-1 pr-3 text-ink-muted">short doc</td>
              {(() => {
                const s = saturationCurve(k1, b, 0.6)
                return CURVE_F_SAMPLES.map((f) => (
                  <td key={f} className="py-1 pr-3 text-ink/85">{(s.find((p) => p.f === f)?.y ?? 0).toFixed(2)}</td>
                ))
              })()}
            </tr>
            <tr>
              <td className="py-1 pr-3 text-ink-muted">long doc</td>
              {(() => {
                const s = saturationCurve(k1, b, 1.8)
                return CURVE_F_SAMPLES.map((f) => (
                  <td key={f} className="py-1 pr-3 text-ink/85">{(s.find((p) => p.f === f)?.y ?? 0).toFixed(2)}</td>
                ))
              })()}
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-muted">
          IDF values for this corpus (N = {index.N}):{' '}
          {results[0].breakdown
            .map((t) => `“${t.term}” → ${idf(index.N, index.docFreq.get(t.term) ?? 0).toFixed(2)}`)
            .join(', ')}
          . Terms absent from the corpus score 0 everywhere.
        </p>
      </div>
    </div>
  )
}
