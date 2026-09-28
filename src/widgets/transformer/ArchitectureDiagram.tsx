import { useState } from 'react'
import { ModuleLink, Tabs, WidgetFrame } from '../../components/ui'

/**
 * The full transformer architecture as one readable, clickable diagram.
 * Two views: the modern decoder-only stack (GPT-style) and the original
 * 2017 encoder-decoder. Every box is clickable and explains what it does,
 * with tensor shapes at GPT-3 scale (decoder view) or 2017 paper scale.
 */

type PartId =
  | 'tokens' | 'embed' | 'pos' | 'block' | 'ln' | 'attn' | 'enc-attn'
  | 'residual' | 'mlp' | 'cross' | 'memory' | 'shifted' | 'unembed' | 'softmax'

type PartInfo = {
  title: string
  body: string
  shape: string
  module: string
}

const PARTS: Record<PartId, PartInfo> = {
  tokens: {
    title: 'Tokens',
    body: 'The tokenizer splits your text into subword IDs from its vocabulary. These integers are the only thing that ever enters the model: no characters, no words, just IDs.',
    shape: 'seq_len integers, e.g. 6 token IDs',
    module: 'tokenization-embeddings',
  },
  embed: {
    title: 'Token embedding lookup',
    body: 'Each ID selects one row of the embedding matrix, a learned dense vector of d_model numbers. This is where categorical IDs become a space the model can do math in.',
    shape: '(seq, d_model), e.g. 6 x 12,288 at GPT-3 scale',
    module: 'tokenization-embeddings',
  },
  pos: {
    title: 'Positional signal',
    body: 'Attention is order-blind by construction, so position information must be added explicitly. The 2017 paper added fixed sinusoidal vectors; GPT learned position embeddings; modern models rotate queries and keys with RoPE inside attention itself.',
    shape: 'same shape as the embedding, added element-wise',
    module: 'tokenization-embeddings',
  },
  block: {
    title: 'One block, repeated N times',
    body: 'The repeating unit of the transformer: LayerNorm, attention, residual add, LayerNorm, MLP, residual add. The 2017 paper stacked 6; GPT-3 stacks 96. Everything a model "knows" is distributed across these blocks.',
    shape: 'shape unchanged: (seq, d_model) in and out',
    module: 'architecture',
  },
  ln: {
    title: 'LayerNorm',
    body: 'Rescales each token vector to a stable range so numbers stay well-conditioned through hundreds of layers. Modern models normalize before each sub-layer (pre-norm); the 2017 paper normalized after, which trains less stably.',
    shape: 'no effect on shape; keeps activations in range',
    module: 'architecture',
  },
  attn: {
    title: 'Multi-head self-attention (causal)',
    body: 'The communication step. Every token computes queries, keys, and values; scores every earlier token with dot products; softmaxes the scores into weights; and replaces its vector with a weighted mix of values. The causal mask hides future positions so the model cannot peek ahead. GPT-3: 96 heads of 128 dims each.',
    shape: 'Q, K, V: (seq, d_model); scores: (heads, seq, seq)',
    module: 'attention',
  },
  'enc-attn': {
    title: 'Multi-head self-attention (bidirectional)',
    body: 'Identical mechanism to the decoder variant, but with no mask: every source token may attend to every other, forward and backward. This is what makes the encoder a reader that builds full-context representations.',
    shape: '2017 paper: 8 heads, d_model 512, d_head 64',
    module: 'attention',
  },
  residual: {
    title: 'Residual add',
    body: 'The sub-layer output is added to its input instead of replacing it. The resulting identity path lets signals and gradients flow through the whole stack, which is what makes very deep transformers trainable.',
    shape: 'element-wise add; shapes unchanged',
    module: 'architecture',
  },
  mlp: {
    title: 'MLP (feed-forward)',
    body: 'The computation step, applied to each position independently: expand to about 4x the width, pass through a non-linearity (GELU), project back. Roughly two-thirds of all parameters live in these layers, and much of a model\'s factual memory is believed to be stored here.',
    shape: 'two linears per layer: (d_model, 4*d_model) and back',
    module: 'architecture',
  },
  cross: {
    title: 'Cross-attention',
    body: 'The bridge between the two towers. Queries come from the decoder stream; keys and values come from the encoder memory. The mask is fully open: every generated token may look at every source token. This is the only channel connecting decoder to encoder.',
    shape: 'queries from decoder; K, V from memory',
    module: 'architecture',
  },
  memory: {
    title: 'Encoder memory',
    body: 'The encoder\'s output vectors, one per source token, after all encoder layers. The decoder re-uses them at every layer through cross-attention: the encoder runs once, the decoder reads it forever.',
    shape: '(src_seq, d_model)',
    module: 'architecture',
  },
  shifted: {
    title: 'Target, shifted right',
    body: 'The decoder input is the target sequence shifted right with a begin-of-sequence token in front. Combined with the causal mask, this guarantees that predicting position i may only use positions before i.',
    shape: '(tgt_seq, d_model)',
    module: 'architecture',
  },
  unembed: {
    title: 'Unembedding (linear head)',
    body: 'Projects each position\'s final vector onto the vocabulary: one score, called a logit, per possible next token. The weights are often tied to the embedding matrix (transposed).',
    shape: '(seq, d_model) becomes (seq, vocab_size)',
    module: 'architecture',
  },
  softmax: {
    title: 'Softmax and sampling',
    body: 'Turns the last position\'s logits into a probability distribution over every token in the vocabulary. Sampling from it (with temperature, top-k, top-p) is what produces text, one token at a time.',
    shape: 'vocab_size probabilities summing to 1',
    module: 'what-is-an-llm',
  },
}

type BoxProps = {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub?: string
  part: PartId
  tone?: 'enc' | 'dec' | 'shared'
  selected: boolean
  onPick: (p: PartId) => void
}

function Box({ x, y, w, h, title, sub, part, tone = 'shared', selected, onPick }: BoxProps) {
  const stroke =
    tone === 'enc' ? 'var(--color-accent)' : tone === 'dec' ? 'var(--color-highlight)' : 'var(--color-ink-muted)'
  const fill = selected ? `color-mix(in srgb, ${stroke} 18%, var(--color-surface))` : 'var(--color-surface)'
  return (
    <g
      onClick={() => onPick(part)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${title}: click for details`}
    >
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={selected ? 2.2 : 1.4} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize={12} fill="var(--color-ink)" style={{ pointerEvents: 'none' }}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-muted)" style={{ pointerEvents: 'none' }}>
          {sub}
        </text>
      )}
    </g>
  )
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink-muted)" strokeWidth={1.3} markerEnd="url(#arrow)" />
  )
}

function PolyArrow({ points, label, labelAt }: { points: string; label?: string; labelAt?: [number, number] }) {
  return (
    <>
      <polyline points={points} fill="none" stroke="var(--color-primary-bright)" strokeWidth={1.5} markerEnd="url(#arrowP)" strokeDasharray="5 3" />
      {label && labelAt && (
        <text x={labelAt[0]} y={labelAt[1]} fontSize={10} fill="var(--color-primary-bright)" fontFamily="ui-monospace, monospace">
          {label}
        </text>
      )}
    </>
  )
}

function ShapeLabel({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  return (
    <text x={x} y={y} fontSize={9.5} fill="var(--color-ink-muted)" fontFamily="ui-monospace, monospace">
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

function ResidDot({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill="var(--color-surface)" stroke="var(--color-ink-muted)" strokeWidth={1.3} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill="var(--color-ink)">+</text>
    </g>
  )
}

export function ArchitectureDiagram() {
  const [view, setView] = useState('Decoder-only (GPT)')
  const [sel, setSel] = useState<PartId>('attn')
  const info = PARTS[sel]
  const isDec = view.startsWith('Decoder')

  return (
    <WidgetFrame
      title="The whole transformer, one diagram"
      subtitle="Click any box to learn what it does. Decoder view shapes shown at GPT-3 scale; two-tower view at 2017 paper scale."
    >
      <Tabs tabs={['Decoder-only (GPT)', 'Encoder-decoder (2017)']} active={view} onChange={setView} />

      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface-raised/30 p-2">
        {isDec ? (
          <svg viewBox="0 0 760 1080" className="mx-auto w-full max-w-xl" aria-label="Decoder-only transformer diagram">
            <defs>
              <marker id="arrow" markerWidth={7} markerHeight={7} refX={6} refY={3.2} orient="auto">
                <path d="M0,0 L6.5,3.2 L0,6.4 z" fill="var(--color-ink-muted)" />
              </marker>
              <marker id="arrowP" markerWidth={7} markerHeight={7} refX={6} refY={3.2} orient="auto">
                <path d="M0,0 L6.5,3.2 L0,6.4 z" fill="var(--color-primary-bright)" />
              </marker>
            </defs>

            <Box x={190} y={16} w={320} h={48} title="Tokens: [2, 3, 4]" sub={'"the cat sat"'} part="tokens" selected={sel === 'tokens'} onPick={setSel} />
            <Arrow x1={300} y1={64} x2={300} y2={94} />

            <Box x={160} y={96} w={280} h={56} title="Token embedding lookup" sub="select row of W_e" part="embed" selected={sel === 'embed'} onPick={setSel} />
            <ShapeLabel x={14} y={118} lines={['(6, 12,288)', 'per token']} />
            <Arrow x1={300} y1={152} x2={300} y2={238} />

            <Box x={470} y={96} w={200} h={56} title="Positional signal" sub="sinusoid / learned / RoPE" part="pos" selected={sel === 'pos'} onPick={setSel} />
            <polyline points="570,152 570,196 316,196" fill="none" stroke="var(--color-ink-muted)" strokeWidth={1.3} markerEnd="url(#arrow)" />
            <ResidDot x={300} y={196} />

            {/* block container */}
            <rect x={120} y={244} width={420} height={520} rx={12} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} strokeDasharray="6 5" opacity={0.7} />
            <text x={330} y={270} textAnchor="middle" fontSize={11} fill="var(--color-accent)" fontFamily="ui-monospace, monospace">
              Block x N (GPT-3: N = 96)
            </text>

            <Box x={150} y={288} w={360} h={52} title="LayerNorm" part="ln" selected={sel === 'ln'} onPick={setSel} tone="enc" />
            <Arrow x1={330} y1={340} x2={330} y2={366} />
            <Box x={150} y={368} w={360} h={60} title="Multi-head self-attention" sub="causal: token i attends to j <= i" part="attn" selected={sel === 'attn'} onPick={setSel} tone="enc" />
            <ShapeLabel x={14} y={392} lines={['96 heads x', '128 dims']} />
            <Arrow x1={330} y1={428} x2={330} y2={452} />
            <ResidDot x={330} y={462} />
            <Box x={150} y={478} w={360} h={48} title="residual add: x + f(x)" part="residual" selected={sel === 'residual'} onPick={setSel} tone="enc" />
            <Arrow x1={330} y1={526} x2={330} y2={552} />
            <Box x={150} y={554} w={360} h={52} title="LayerNorm" part="ln" selected={sel === 'ln'} onPick={setSel} tone="enc" />
            <Arrow x1={330} y1={606} x2={330} y2={632} />
            <Box x={150} y={634} w={360} h={60} title="MLP (feed-forward)" sub="expand 4x, GELU, project back" part="mlp" selected={sel === 'mlp'} onPick={setSel} tone="enc" />
            <ShapeLabel x={14} y={660} lines={['2/3 of all', 'parameters']} />
            <Arrow x1={330} y1={694} x2={330} y2={718} />
            <Box x={150} y={720} w={360} h={44} title="residual add: x + f(x)" part="residual" selected={sel === 'residual'} onPick={setSel} tone="enc" />

            <Arrow x1={330} y1={764} x2={330} y2={794} />
            <Box x={190} y={796} w={280} h={48} title="Final LayerNorm" part="ln" selected={sel === 'ln'} onPick={setSel} tone="enc" />
            <Arrow x1={330} y1={844} x2={330} y2={874} />
            <Box x={150} y={876} w={360} h={56} title="Unembedding: linear to vocab" sub="d_model to 50,257 logits" part="unembed" selected={sel === 'unembed'} onPick={setSel} />
            <ShapeLabel x={14} y={898} lines={['(6, 50,257)']} />
            <Arrow x1={330} y1={932} x2={330} y2={962} />
            <Box x={150} y={964} w={360} h={64} title="Softmax: next-token probabilities" sub="sample one, append, repeat" part="softmax" selected={sel === 'softmax'} onPick={setSel} />
          </svg>
        ) : (
          <svg viewBox="0 0 920 1090" className="mx-auto w-full max-w-3xl" aria-label="Encoder-decoder transformer diagram">
            <defs>
              <marker id="arrow" markerWidth={7} markerHeight={7} refX={6} refY={3.2} orient="auto">
                <path d="M0,0 L6.5,3.2 L0,6.4 z" fill="var(--color-ink-muted)" />
              </marker>
              <marker id="arrowP" markerWidth={7} markerHeight={7} refX={6} refY={3.2} orient="auto">
                <path d="M0,0 L6.5,3.2 L0,6.4 z" fill="var(--color-primary-bright)" />
              </marker>
            </defs>

            {/* Encoder column */}
            <text x={210} y={14} textAnchor="middle" fontSize={12} fill="var(--color-accent)" fontFamily="ui-monospace, monospace">Encoder: reads the source</text>
            <Box x={40} y={22} w={340} h={48} title="Source tokens: the cat sat" part="tokens" tone="enc" selected={sel === 'tokens'} onPick={setSel} />
            <Arrow x1={210} y1={70} x2={210} y2={92} />
            <Box x={40} y={94} w={340} h={56} title="Embedding + positional signal" sub="sinusoidal in 2017" part="embed" tone="enc" selected={sel === 'embed'} onPick={setSel} />
            <Arrow x1={210} y1={150} x2={210} y2={176} />

            <rect x={40} y={178} width={340} height={484} rx={12} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} strokeDasharray="6 5" opacity={0.7} />
            <text x={210} y={200} textAnchor="middle" fontSize={11} fill="var(--color-accent)" fontFamily="ui-monospace, monospace">Encoder layer x N (2017: N = 6)</text>
            <Box x={70} y={214} w={280} h={48} title="LayerNorm" part="ln" tone="enc" selected={sel === 'ln'} onPick={setSel} />
            <Arrow x1={210} y1={262} x2={210} y2={286} />
            <Box x={70} y={288} w={280} h={60} title="Self-attention: bidirectional" sub="every token sees every token" part="enc-attn" tone="enc" selected={sel === 'enc-attn'} onPick={setSel} />
            <Arrow x1={210} y1={348} x2={210} y2={372} />
            <ResidDot x={210} y={382} />
            <Box x={70} y={398} w={280} h={48} title="residual add: x + f(x)" part="residual" tone="enc" selected={sel === 'residual'} onPick={setSel} />
            <Arrow x1={210} y1={446} x2={210} y2={470} />
            <Box x={70} y={472} w={280} h={48} title="LayerNorm" part="ln" tone="enc" selected={sel === 'ln'} onPick={setSel} />
            <Arrow x1={210} y1={520} x2={210} y2={544} />
            <Box x={70} y={546} w={280} h={60} title="FFN (feed-forward)" sub="expand 4x, ReLU, project back" part="mlp" tone="enc" selected={sel === 'mlp'} onPick={setSel} />
            <Arrow x1={210} y1={606} x2={210} y2={630} />
            <Box x={70} y={612} w={280} h={44} title="residual add: x + f(x)" part="residual" tone="enc" selected={sel === 'residual'} onPick={setSel} />

            <Arrow x1={210} y1={662} x2={210} y2={690} />
            <Box x={40} y={692} w={340} h={64} title="Encoder memory" sub="keys + values, one vector per source token" part="memory" tone="enc" selected={sel === 'memory'} onPick={setSel} />

            {/* Decoder column */}
            <text x={710} y={14} textAnchor="middle" fontSize={12} fill="var(--color-highlight)" fontFamily="ui-monospace, monospace">Decoder: writes the target</text>
            <Box x={540} y={22} w={340} h={48} title="Target so far, shifted right" sub="begin token + le chat" part="shifted" tone="dec" selected={sel === 'shifted'} onPick={setSel} />
            <Arrow x1={710} y1={70} x2={710} y2={92} />
            <Box x={540} y={94} w={340} h={56} title="Embedding + positional signal" part="embed" tone="dec" selected={sel === 'embed'} onPick={setSel} />
            <Arrow x1={710} y1={150} x2={710} y2={176} />

            <rect x={540} y={178} width={340} height={734} rx={12} fill="none" stroke="var(--color-highlight)" strokeWidth={1.2} strokeDasharray="6 5" opacity={0.7} />
            <text x={710} y={200} textAnchor="middle" fontSize={11} fill="var(--color-highlight)" fontFamily="ui-monospace, monospace">Decoder layer x N (2017: N = 6)</text>
            <Box x={570} y={214} w={280} h={48} title="LayerNorm" part="ln" tone="dec" selected={sel === 'ln'} onPick={setSel} />
            <Arrow x1={710} y1={262} x2={710} y2={286} />
            <Box x={570} y={288} w={280} h={60} title="Masked self-attention" sub="causal: position i sees j <= i" part="attn" tone="dec" selected={sel === 'attn'} onPick={setSel} />
            <Arrow x1={710} y1={348} x2={710} y2={372} />
            <ResidDot x={710} y={382} />
            <Box x={570} y={398} w={280} h={48} title="residual add: x + f(x)" part="residual" tone="dec" selected={sel === 'residual'} onPick={setSel} />
            <Arrow x1={710} y1={446} x2={710} y2={470} />
            <Box x={570} y={472} w={280} h={48} title="LayerNorm" part="ln" tone="dec" selected={sel === 'ln'} onPick={setSel} />
            <Arrow x1={710} y1={520} x2={710} y2={544} />
            <Box x={570} y={546} w={280} h={60} title="Cross-attention" sub="queries: decoder; K, V: encoder memory" part="cross" tone="dec" selected={sel === 'cross'} onPick={setSel} />
            <Arrow x1={710} y1={606} x2={710} y2={630} />
            <ResidDot x={710} y={640} />
            <Box x={570} y={656} w={280} h={48} title="residual add: x + f(x)" part="residual" tone="dec" selected={sel === 'residual'} onPick={setSel} />
            <Arrow x1={710} y1={704} x2={710} y2={728} />
            <Box x={570} y={730} w={280} h={48} title="LayerNorm" part="ln" tone="dec" selected={sel === 'ln'} onPick={setSel} />
            <Arrow x1={710} y1={778} x2={710} y2={802} />
            <Box x={570} y={804} w={280} h={60} title="FFN (feed-forward)" part="mlp" tone="dec" selected={sel === 'mlp'} onPick={setSel} />
            <Arrow x1={710} y1={864} x2={710} y2={888} />
            <Box x={570} y={890} w={280} h={44} title="residual add: x + f(x)" part="residual" tone="dec" selected={sel === 'residual'} onPick={setSel} />

            {/* memory -> cross-attention bridge */}
            <PolyArrow points="380,724 460,724 460,576 534,576" label="K, V" labelAt={[470, 690]} />

            <Arrow x1={710} y1={912} x2={710} y2={938} />
            <Box x={540} y={940} w={340} h={48} title="Linear to vocab (unembedding)" part="unembed" tone="dec" selected={sel === 'unembed'} onPick={setSel} />
            <Arrow x1={710} y1={988} x2={710} y2={1014} />
            <Box x={540} y={1016} w={340} h={56} title="Softmax: next-token probabilities" sub="sample one, append, repeat" part="softmax" tone="dec" selected={sel === 'softmax'} onPick={setSel} />
          </svg>
        )}
      </div>

      {/* Click info panel */}
      <div className="mt-3 rounded-lg border border-border bg-surface p-3" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-ink">{info.title}</h4>
          <span className="font-mono text-[10px] text-ink-muted">{info.shape}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-ink/85">{info.body}</p>
        <p className="mt-1.5 text-xs">
          Deep dive: <ModuleLink id={info.module} />
        </p>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">
        Layout follows the flow of the data: tokens at the top, probabilities at the bottom. The same block repeats N
        times; the tower views differ only in which attention masks are applied.
      </p>
    </WidgetFrame>
  )
}
