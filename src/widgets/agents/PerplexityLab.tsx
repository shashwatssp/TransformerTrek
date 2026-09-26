/**
 * PerplexityLab, a real bigram language model trained (counted) in the
 * browser over a small pinned corpus. Per-token probabilities, bits of
 * surprise, and PPL are computed live with add-k smoothing; a slider shows
 * how smoothing reshapes them. No canned numbers.
 */
import { useMemo, useState } from 'react'
import { Slider } from '../../components/ui'

// ── Corpus + model ──────────────────────────────────────────────────────────

const CORPUS: string[] = [
  'the agent calls a tool',
  'the agent reads the observation',
  'the model picks the next token',
  'the model calls a tool',
  'the agent writes the final answer',
  'the tool returns an observation',
  'the observation goes into the context',
  'the context grows every turn',
]

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z\s]/g, ' ').trim().split(/\s+/).filter(Boolean)
}

type BigramModel = {
  unigram: Map<string, number>
  bigram: Map<string, number>
  vocab: string[]
  totalTokens: number
}

function buildBigramModel(corpus: string[]): BigramModel {
  const unigram = new Map<string, number>()
  const bigram = new Map<string, number>()
  for (const line of corpus) {
    const toks = tokenize(line)
    for (let i = 0; i < toks.length; i++) {
      unigram.set(toks[i], (unigram.get(toks[i]) ?? 0) + 1)
      if (i > 0) {
        const key = `${toks[i - 1]} ${toks[i]}`
        bigram.set(key, (bigram.get(key) ?? 0) + 1)
      }
    }
  }
  return { unigram, bigram, vocab: [...unigram.keys()].sort(), totalTokens: [...unigram.values()].reduce((a, b) => a + b, 0) }
}

const SENTENCES = {
  indomain: 'the agent calls a tool',
  partial: 'the model reads the context',
  offdomain: 'the cat sat on the mat',
} as const

type SentenceKey = keyof typeof SENTENCES

// ── Component ───────────────────────────────────────────────────────────────

export function PerplexityLab() {
  const [sentenceKey, setSentenceKey] = useState<SentenceKey>('indomain')
  const [k, setK] = useState(0.1)

  const model = useMemo(() => buildBigramModel(CORPUS), [])
  const V = model.vocab.length
  const sentence = SENTENCES[sentenceKey]

  const analysis = useMemo(() => {
    const toks = tokenize(sentence)
    const rows = toks.slice(1).map((w2, i) => {
      const w1 = toks[i]
      const cBigram = model.bigram.get(`${w1} ${w2}`) ?? 0
      const cUnigram = model.unigram.get(w1) ?? 0
      const p = (cBigram + k) / (cUnigram + k * V) // add-k smoothing
      const bits = -Math.log2(p)
      return { w1, w2, cBigram, cUnigram, p, bits }
    })
    const totalBits = rows.reduce((a, r) => a + r.bits, 0)
    const n = rows.length
    const ppl = Math.pow(2, totalBits / n)
    return { rows, totalBits, n, ppl }
  }, [sentence, model, k, V])

  const surpriseTone = (bits: number) =>
    bits < 2 ? 'text-success' : bits < 5 ? 'text-highlight' : 'text-danger'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Pick a test sentence">
        {(
          [
            ['indomain', 'In-domain'],
            ['partial', 'Half-seen'],
            ['offdomain', 'Off-domain'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSentenceKey(key)}
            aria-pressed={sentenceKey === key}
            aria-label={`Test sentence: ${label}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              sentenceKey === key
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:bg-surface-raised hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        <code className="rounded bg-surface px-2 py-1 font-mono text-[11px] text-ink/85">"{sentence}"</code>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_230px]">
        {/* Per-bigram table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-surface-raised/60 text-ink-muted">
                <th className="px-2.5 py-1.5 font-medium">bigram</th>
                <th className="px-2.5 py-1.5 font-medium">count(w1 w2)</th>
                <th className="px-2.5 py-1.5 font-medium">count(w1)</th>
                <th className="px-2.5 py-1.5 font-medium">P(w2|w1)</th>
                <th className="px-2.5 py-1.5 font-medium">surprise (bits)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {analysis.rows.map((r) => (
                <tr key={`${r.w1}-${r.w2}`} className="border-t border-border">
                  <td className="px-2.5 py-1.5 text-ink/85">{r.w1} → {r.w2}</td>
                  <td className="px-2.5 py-1.5 text-ink/85">{r.cBigram}</td>
                  <td className="px-2.5 py-1.5 text-ink/85">{r.cUnigram}</td>
                  <td className="px-2.5 py-1.5 text-ink/85">{r.p.toFixed(4)}</td>
                  <td className={`px-2.5 py-1.5 ${surpriseTone(r.bits)}`}>{r.bits.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-surface-raised/40 p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Perplexity</div>
            <div className="mt-1 font-mono text-3xl font-bold text-accent" aria-live="polite">
              {analysis.ppl.toFixed(1)}
            </div>
            <div className="mt-1 text-[10px] leading-4 text-ink-muted">
              effective branch factor, the model acts as if unsure among ~{Math.round(analysis.ppl)} words per token
            </div>
          </div>
          <ul className="space-y-1 font-mono text-[10px] text-ink-muted">
            <li>corpus tokens: {model.totalTokens}</li>
            <li>vocab V: {V}</li>
            <li>test tokens N: {analysis.n + 1}</li>
            <li>total surprise: {analysis.totalBits.toFixed(2)} bits</li>
          </ul>
        </div>
      </div>

      <div className="max-w-xs">
        <Slider
          label="Add-k smoothing"
          value={k}
          min={0.01}
          max={1}
          step={0.01}
          onChange={setK}
          format={(v) => `k = ${v.toFixed(2)}`}
        />
      </div>
      <p className="text-[11px] leading-5 text-ink-muted">
        P(w2|w1) = (count(w1 w2) + k) / (count(w1) + k·V). Slide k toward 0 and watch off-domain
        words explode to huge surprise, smoothing is what keeps unseen bigrams merely improbable
        instead of impossible. Real LLMs compute the same quantity, just with a neural network
        instead of a count table.
      </p>
    </div>
  )
}
