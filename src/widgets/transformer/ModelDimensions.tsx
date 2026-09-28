import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { WidgetFrame } from '../../components/ui'

/**
 * Real published embedding widths (d_model) across model families, drawn to a
 * log scale so 384 and 12,288 fit on one bar chart. Every row cites its
 * source. Claude's row is honestly marked undisclosed: Anthropic does not
 * publish its architecture, and the site does not invent numbers.
 */

type ModelRow = {
  name: string
  family: 'encoder-decoder' | 'encoder-only' | 'decoder-only' | 'embedder' | 'proprietary'
  year: number
  /** d_model; for families use the widest published member */
  dims: number[] | null
  detail: string
  source: string
  url: string
}

const ROWS: ModelRow[] = [
  {
    name: 'Original transformer (2017)',
    family: 'encoder-decoder',
    year: 2017,
    dims: [512],
    detail: 'd_model 512, 6 encoder + 6 decoder layers, 8 heads, FFN width 2048. Both towers the same width, the number every later model scaled up from.',
    source: 'Vaswani et al. 2017, Table 3',
    url: 'https://arxiv.org/abs/1706.03762',
  },
  {
    name: 'MiniLM-L6',
    family: 'embedder',
    year: 2019,
    dims: [384],
    detail: '384-dim sentence embeddings from a distilled 6-layer encoder. Proof that useful meaning spaces can be tiny; see the MiniLM module.',
    source: 'Wang et al. 2019 / SBERT docs',
    url: 'https://arxiv.org/abs/1908.06954',
  },
  {
    name: 'BERT-base',
    family: 'encoder-only',
    year: 2018,
    dims: [768],
    detail: '768 dims, 12 layers, 12 heads. The 768 "GPT-size" embedding became a de-facto standard for a generation of models.',
    source: 'Devlin et al. 2018',
    url: 'https://arxiv.org/abs/1810.04805',
  },
  {
    name: 'GPT-1 / GPT-2',
    family: 'decoder-only',
    year: 2018,
    dims: [768, 1600],
    detail: 'GPT-1: 768 dims, 12 layers. GPT-2 small kept 768; GPT-2 XL widened to 1,600 dims across 48 layers, vocab 50,257.',
    source: 'Radford et al. 2018, 2019',
    url: 'https://arxiv.org/abs/1904.10520',
  },
  {
    name: 'text-embedding-3-large',
    family: 'embedder',
    year: 2024,
    dims: [3072],
    detail: 'OpenAI embedding API model: up to 3,072 output dimensions, reducible via Matryoshka-style shortening. ada-002 and 3-small use 1,536.',
    source: 'OpenAI embeddings docs',
    url: 'https://platform.openai.com/docs/guide/embeddings',
  },
  {
    name: 'Llama 3 (8B / 405B)',
    family: 'decoder-only',
    year: 2024,
    dims: [4096, 16384],
    detail: '4,096 dims for the 8B model; 16,384 dims and 126 layers for the 405B. Vocab 128,256, tied embeddings.',
    source: 'Llama 3 paper, Table 3',
    url: 'https://arxiv.org/abs/2407.21783',
  },
  {
    name: 'GPT-3 (175B)',
    family: 'decoder-only',
    year: 2020,
    dims: [12288],
    detail: '12,288 dims, 96 layers, 96 heads of 128 dims each, vocab 50,257. The widest fully published GPT, and the reference point for "how wide is a frontier model".',
    source: 'Brown et al. 2020, Table 2.1',
    url: 'https://arxiv.org/abs/2005.14165',
  },
  {
    name: 'Claude (Anthropic)',
    family: 'proprietary',
    year: 2023,
    dims: null,
    detail: 'Decoder-only transformer, like GPT. Anthropic does not publish d_model, layer count, or parameter count for Claude, and no verifiable figure exists. Third-party estimates place flagship models from hundreds of billions to trillions of parameters, which implies hidden widths in the same 4k to 16k+ class as other frontier models, but treat any specific number you see as rumor.',
    source: 'Anthropic system cards (architecture unpublished)',
    url: 'https://docs.claude.com/en/docs/about-claude/models',
  },
]

const FAMILY_STYLES: Record<ModelRow['family'], { bar: string; label: string }> = {
  'encoder-decoder': { bar: 'var(--color-primary)', label: 'enc-dec' },
  'encoder-only': { bar: 'var(--color-success)', label: 'encoder' },
  'decoder-only': { bar: 'var(--color-accent)', label: 'decoder' },
  embedder: { bar: 'var(--color-highlight)', label: 'embedder' },
  proprietary: { bar: 'var(--color-ink-muted)', label: 'proprietary' },
}

const MAX_DIM = 16384
/** Log-scale fraction of the bar width, 256 dims = ~0 anchor. */
const barFrac = (d: number) => Math.max(0.03, (Math.log2(d) - Math.log2(256)) / (Math.log2(MAX_DIM) - Math.log2(256)))

export function ModelDimensions() {
  const [open, setOpen] = useState<number | null>(5)
  const reduced = useReducedMotion()

  return (
    <WidgetFrame
      title="How many dimensions do real models use?"
      subtitle="Published embedding widths (d_model), log scale. Click a row for layers, heads, vocab, and the source."
    >
      <div className="space-y-1.5">
        {ROWS.map((r, i) => {
          const isOpen = open === i
          const fam = FAMILY_STYLES[r.family]
          const width = r.dims ? barFrac(Math.max(...r.dims)) : null
          return (
            <div key={r.name} className="rounded-lg border border-border bg-surface">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
              >
                <span className="w-40 shrink-0 sm:w-52">
                  <span className="block text-xs font-medium text-ink">{r.name}</span>
                  <span className="block text-[10px] text-ink-muted">{r.year}</span>
                </span>
                <span className="relative h-4 flex-1 rounded bg-surface-raised/60">
                  {width !== null ? (
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded"
                      style={{ background: fam.bar, opacity: 0.75 }}
                      initial={false}
                      animate={{ width: `${width * 100}%` }}
                      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 26 }}
                    />
                  ) : (
                    <span
                      className="absolute inset-y-0 left-0 rounded border border-dashed"
                      style={{ width: '38%', borderColor: 'var(--color-ink-muted)', borderLeft: '3px solid var(--color-danger)' }}
                      title="Unknown: Anthropic does not publish this number"
                    />
                  )}
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-xs text-ink">
                  {r.dims ? Math.max(...r.dims).toLocaleString('en-US') : 'undisclosed'}
                </span>
                <span aria-hidden className={`text-xs text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {isOpen && (
                <div className="border-t border-border/60 px-3 py-2.5">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-ink-muted">{fam.label}</span>
                    {r.dims && r.dims.length > 1 && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-ink-muted">
                        {r.dims.map((d) => d.toLocaleString('en-US')).join(' / ')} dims
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-ink/85">{r.detail}</p>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-block text-[11px] font-medium text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent"
                  >
                    Source: {r.source}
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-ink-muted">
        Bars show the largest published member of each family on a log scale (each tick of the bar doubles the
        width). Reading it: embedding widths grew 768 → 12,288 between GPT-1 and GPT-3, a 16-fold increase, while
        today's closed models keep their exact widths to themselves. GPT-4 and newer OpenAI models are undisclosed
        the same way Claude is.
      </p>
    </WidgetFrame>
  )
}
