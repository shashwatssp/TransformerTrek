import { useState } from 'react'
import { Button, Tabs, WidgetFrame } from '../../components/ui'
import { makeHeads, makeProjections, scaledDotProductAttention } from '../../lib/attention'

const SENTENCES = ['The cat chased the mouse', 'The bank of the river'] as const
const D_MODEL = 4
const D_HEAD = 4
const N_HEADS = 3
const SEED = 7

const STAGE_NAMES = ['1 · Q, K, V', '2 · Scores', '3 · Softmax', '4 · Causal mask', '5 · Output']
const LAST_STAGE = STAGE_NAMES.length - 1

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(2) : '−∞'
}

/** Cyan for positive, warm red for negative; intensity scales with |v|/maxAbs. */
function heatStyle(v: number, maxAbs: number): { backgroundColor: string; color: string } {
  if (!Number.isFinite(v)) return { backgroundColor: 'rgba(139, 149, 168, 0.08)', color: '#8b95a8' }
  const a = maxAbs > 0 ? Math.min(1, Math.abs(v) / maxAbs) : 0
  const alpha = 0.1 + a * 0.72
  const rgb = v >= 0 ? '34, 211, 238' : '248, 113, 113'
  return { backgroundColor: `rgba(${rgb}, ${alpha.toFixed(3)})`, color: a > 0.62 ? '#0a0e1a' : '#e6ebf4' }
}

/** Accessible heatmap table: every cell shows its number (never color alone). */
function Matrix({
  values,
  tokens,
  selRow,
  caption,
}: {
  values: number[][]
  tokens: string[]
  selRow: number
  caption: string
}) {
  const maxAbs = Math.max(
    ...values.flat().filter(Number.isFinite).map(Math.abs),
    1e-9,
  )
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[11px]" aria-label={caption}>
        <thead>
          <tr>
            <th scope="col" className="px-1.5 py-1 text-left font-medium text-ink-muted">q \ k</th>
            {tokens.map((t) => (
              <th scope="col" key={t} className="px-1.5 py-1 font-mono font-medium text-ink-muted">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, i) => (
            <tr key={i}>
              <th
                scope="row"
                className={`px-1.5 py-1 text-left font-mono ${i === selRow ? 'font-semibold text-accent' : 'text-ink-muted'}`}
              >
                {i === selRow ? '▶ ' : ''}{tokens[i]}
              </th>
              {row.map((v, j) => {
                const style = heatStyle(v, maxAbs)
                return (
                  <td
                    key={j}
                    className="px-1.5 py-1 text-center font-mono"
                    style={style}
                    title={`query "${tokens[i]}" vs key "${tokens[j]}": ${fmt(v)}`}
                  >
                    {fmt(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Horizontal weight bars for the selected query row. */
function RowBars({
  weights,
  tokens,
  selRow,
  label,
}: {
  weights: number[]
  tokens: string[]
  selRow: number
  label: string
}) {
  const sum = weights.reduce((a, b) => a + b, 0)
  return (
    <div className="mt-3" role="group" aria-label={label}>
      <div className="text-xs text-ink-muted">{label}</div>
      <ul className="mt-1.5 space-y-1">
        {weights.map((w, j) => (
          <li key={j} className="flex items-center gap-2 text-xs">
            <span className={`w-16 shrink-0 truncate text-right font-mono ${j === selRow ? 'text-accent' : 'text-ink'}`}>
              {tokens[j]}
            </span>
            <span className="relative h-3.5 flex-1 rounded bg-surface-raised">
              <span
                className={`absolute inset-y-0 left-0 rounded ${j === selRow ? 'bg-primary-bright' : 'bg-accent'}`}
                style={{ width: `${w * 100}%` }}
              />
            </span>
            <span className="w-12 shrink-0 font-mono text-ink-muted">{w.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 font-mono text-[10px] text-ink-muted">row sum = {sum.toFixed(2)}</p>
    </div>
  )
}

function vec(v: number[]): string {
  return `[${v.map((x) => x.toFixed(2)).join(', ')}]`
}

/**
 * Flagship attention walkthrough. Step through QKV → score matrix → softmax →
 * causal mask → weighted output, with every intermediate number visible, plus
 * a multi-head tab. All math runs in the browser via src/lib/attention.ts.
 */
export function AttentionPlayground() {
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [stage, setStage] = useState(0)
  const [tab, setTab] = useState('Single head')
  const [row, setRow] = useState(SENTENCES[0].split(' ').length - 1)
  const [headIdx, setHeadIdx] = useState(0)

  const seqs = SENTENCES[sentenceIdx].split(' ')
  const n = seqs.length
  const selRow = Math.min(row, n - 1)

  const proj = makeProjections(seqs, D_MODEL, D_HEAD, SEED)
  const unmasked = scaledDotProductAttention(proj.Q, proj.K, proj.V, { causal: false })
  const masked = scaledDotProductAttention(proj.Q, proj.K, proj.V, { causal: true })
  const heads = makeHeads(seqs, D_MODEL, D_HEAD, N_HEADS).map((h) =>
    scaledDotProductAttention(h.Q, h.K, h.V, { causal: true }),
  )

  const chooseSentence = (idx: number) => {
    setSentenceIdx(idx)
    setRow(SENTENCES[idx].split(' ').length - 1)
  }

  const dim0Terms = masked.weights[selRow]
    .map((wj, j) => `(${wj.toFixed(2)}×${proj.V[j][0].toFixed(2)})`)
    .join(' + ')
  const dim0Sum = masked.weights[selRow].reduce((acc, wj, j) => acc + wj * proj.V[j][0], 0)

  return (
    <WidgetFrame
      title="Attention playground"
      subtitle="Real scaled dot-product attention on toy 4-dim embeddings — every matrix computed live in your browser."
    >
      {/* Sentence picker */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a sentence">
        {SENTENCES.map((s, i) => (
          <button
            key={s}
            onClick={() => chooseSentence(i)}
            aria-pressed={sentenceIdx === i}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sentenceIdx === i
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            "{s}"
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Tabs tabs={['Single head', 'Multi-head']} active={tab} onChange={setTab} />
      </div>

      {/* Query-row selector */}
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Select the query token (row) to inspect">
        <span className="text-xs text-ink-muted">inspect row:</span>
        {seqs.map((t, i) => (
          <button
            key={`${t}-${i}`}
            onClick={() => setRow(i)}
            aria-pressed={selRow === i}
            className={`rounded border px-2 py-0.5 font-mono text-xs transition ${
              selRow === i
                ? 'border-accent/60 bg-accent/15 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Single head' ? (
        <>
          {/* Stage stepper */}
          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Attention stages">
            <Button variant="ghost" onClick={() => setStage((s) => Math.max(0, s - 1))}>
              ◀ Prev
            </Button>
            <Button variant="ghost" onClick={() => setStage((s) => Math.min(LAST_STAGE, s + 1))}>
              Next ▶
            </Button>
            <ol className="flex flex-wrap gap-1" aria-label={`Stage ${stage + 1} of ${STAGE_NAMES.length}: ${STAGE_NAMES[stage]}`}>
              {STAGE_NAMES.map((sName, i) => (
                <li key={sName}>
                  <button
                    onClick={() => setStage(i)}
                    aria-pressed={stage === i}
                    aria-label={`Stage ${sName}`}
                    className={`h-2.5 w-6 rounded-full transition ${i === stage ? 'bg-accent' : 'bg-border hover:bg-ink-muted'}`}
                  />
                </li>
              ))}
            </ol>
            <span className="font-mono text-xs text-accent" aria-live="polite">
              {STAGE_NAMES[stage]}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface-raised/30 p-4">
            {stage === 0 && (
              <div>
                <p className="text-sm text-ink/85">
                  Every token's embedding <span className="font-mono">x</span> (d_model = {D_MODEL}) is
                  multiplied by three learned matrices: <span className="font-mono text-accent">W_Q</span>,{' '}
                  <span className="font-mono text-accent">W_K</span>,{' '}
                  <span className="font-mono text-accent">W_V</span>, producing a query, a key, and a
                  value of d_head = {D_HEAD} each. Below: the actual vectors (fixed random seed).
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="border-collapse text-xs" aria-label="Query, key and value vectors per token">
                    <thead>
                      <tr className="text-left text-ink-muted">
                        <th scope="col" className="py-1 pr-3 font-medium">token</th>
                        <th scope="col" className="py-1 pr-3 font-medium">q = x·W_Q</th>
                        <th scope="col" className="py-1 pr-3 font-medium">k = x·W_K</th>
                        <th scope="col" className="py-1 font-medium">v = x·W_V</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seqs.map((t, i) => (
                        <tr key={i} className="border-t border-border/60">
                          <th scope="row" className={`py-1 pr-3 text-left font-mono ${i === selRow ? 'text-accent' : 'text-ink'}`}>
                            {i === selRow ? '▶ ' : ''}{t}
                          </th>
                          <td className="py-1 pr-3 font-mono text-[11px] text-ink/80">{vec(proj.Q[i])}</td>
                          <td className="py-1 pr-3 font-mono text-[11px] text-ink/80">{vec(proj.K[i])}</td>
                          <td className="py-1 font-mono text-[11px] text-ink/80">{vec(proj.V[i])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stage === 1 && (
              <div>
                <p className="text-sm text-ink/85">
                  Each query is dotted with every key and scaled by √d = {Math.sqrt(D_HEAD)}:{' '}
                  <span className="font-mono text-accent">score(i,j) = q_i·k_j / √d</span>. Brighter = bigger.
                </p>
                <div className="mt-3">
                  <Matrix values={unmasked.scores} tokens={seqs} selRow={selRow} caption="Raw attention scores (q·k/√d)" />
                </div>
                <p className="mt-3 font-mono text-[11px] leading-5 text-ink-muted">
                  row "{seqs[selRow]}": {seqs.map((t, j) => `${t}=${unmasked.scores[selRow][j].toFixed(2)}`).join(', ')}
                </p>
              </div>
            )}

            {stage === 2 && (
              <div>
                <p className="text-sm text-ink/85">
                  Softmax each row: scores become positive weights that sum to exactly 1. Row "
                  {seqs[selRow]}" decides how much it listens to each earlier token.
                </p>
                <div className="mt-3">
                  <Matrix values={unmasked.weights} tokens={seqs} selRow={selRow} caption="Softmax attention weights (no mask)" />
                </div>
                <RowBars weights={unmasked.weights[selRow]} tokens={seqs} selRow={selRow} label={`Weights for query "${seqs[selRow]}" (no mask yet)`} />
              </div>
            )}

            {stage === 3 && (
              <div>
                <p className="text-sm text-ink/85">
                  A decoder may not look at the future: position j &gt; i gets{' '}
                  <span className="font-mono text-danger">−∞</span> before softmax, so its weight
                  becomes exactly 0. In real code the mask is applied <em>before</em> softmax — we
                  show it separately to build intuition.
                </p>
                <div className="mt-3">
                  <Matrix values={masked.masked} tokens={seqs} selRow={selRow} caption="Causally masked scores (−∞ above the diagonal)" />
                </div>
                <RowBars weights={masked.weights[selRow]} tokens={seqs} selRow={selRow} label={`Final weights for "${seqs[selRow]}" after masked softmax`} />
              </div>
            )}

            {stage === 4 && (
              <div>
                <p className="text-sm text-ink/85">
                  The output for each token is a weighted sum of all value vectors:{' '}
                  <span className="font-mono text-accent">out_i = Σ_j w_ij · v_j</span>. For row "
                  {seqs[selRow]}", dimension 0:
                </p>
                <p className="mt-2 break-all font-mono text-[11px] text-ink/85">
                  out[{seqs[selRow]}][0] = {dim0Terms} = {dim0Sum.toFixed(2)}
                </p>
                <div className="mt-3">
                  <Matrix values={masked.outputs} tokens={seqs} selRow={selRow} caption="Attention output vectors (weighted sums of values)" />
                </div>
                <p className="mt-3 text-[11px] text-ink-muted">
                  Each row is now a context-aware vector — "{seqs[selRow]}" has absorbed information
                  from the tokens it attends to.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-ink/85">
            Real transformers run <span className="font-medium text-ink">h</span> attention heads in
            parallel, each with its own W_Q, W_K, W_V. Below: {N_HEADS} heads over the same sentence
            (same seed per head) — each learns a different notion of "what to attend to".
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Select a head to inspect">
            {heads.map((_, h) => (
              <button
                key={h}
                onClick={() => setHeadIdx(h)}
                aria-pressed={headIdx === h}
                className={`rounded border px-2 py-0.5 text-xs font-medium transition ${
                  headIdx === h
                    ? 'border-accent/60 bg-accent/15 text-accent'
                    : 'border-border text-ink-muted hover:text-ink'
                }`}
              >
                Head {h + 1}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {heads.map((res, h) => (
              <div
                key={h}
                className={`rounded-lg border p-2 ${h === headIdx ? 'border-accent/50' : 'border-border'}`}
              >
                <div className="mb-1.5 font-mono text-[10px] text-ink-muted">head {h + 1} weights</div>
                <Matrix values={res.weights} tokens={seqs} selRow={selRow} caption={`Attention weights for head ${h + 1}`} />
              </div>
            ))}
          </div>
          <RowBars
            weights={heads[headIdx].weights[selRow]}
            tokens={seqs}
            selRow={selRow}
            label={`Head ${headIdx + 1} weights for query "${seqs[selRow]}"`}
          />
        </div>
      )}

      <p className="mt-4 text-[11px] leading-5 text-ink-muted">
        Toy setup: {D_MODEL}-dim embeddings, {D_HEAD}-dim heads, deterministic seeded projections from{' '}
        <span className="font-mono">src/lib/attention.ts</span>. Same mechanism, just tiny enough to
        read every number.
      </p>
    </WidgetFrame>
  )
}
