import { useEffect, useState } from 'react'
import { ModuleLink, Tabs, WidgetFrame } from '../../components/ui'

/**
 * The whole transformer on one screen, drawn as a left-to-right pipeline
 * (the layout the best interactive references converged on: browser screens
 * are landscape, and data flows in reading order). Two lenses over the same
 * compact diagram:
 * - Story mode: an editing-room analogy (shorthand notes, meaning cards,
 *   editor passes, one guess at a time) with an animated scene-by-scene
 *   walkthrough for first-time readers.
 * - Technical mode: real component names with tensor shapes at GPT-3 scale
 *   (decoder view) or 2017 paper scale (encoder-decoder view).
 * Every box is clickable in both lenses.
 */

type PartId =
  | 'tokens' | 'embed' | 'pos' | 'block' | 'ln' | 'attn' | 'enc-attn'
  | 'residual' | 'mlp' | 'cross' | 'memory' | 'shifted' | 'unembed' | 'softmax'

type PartInfo = {
  title: string
  story: string
  body: string
  shape: string
  module: string
}

const PARTS: Record<PartId, PartInfo> = {
  tokens: {
    title: 'Tokens',
    story: 'Shorthand notes',
    body: 'The tokenizer splits your text into subword IDs from its vocabulary. These integers are the only thing that ever enters the model: no characters, no words, just IDs.',
    shape: 'seq_len integers, e.g. 6 token IDs',
    module: 'tokenization-embeddings',
  },
  embed: {
    title: 'Embedding lookup',
    story: 'Meaning cards',
    body: 'Each ID selects one row of the embedding matrix, a learned dense vector of d_model numbers. This is where categorical IDs become a space the model can do math in.',
    shape: '(seq, d_model), e.g. 6 x 12,288 at GPT-3 scale',
    module: 'tokenization-embeddings',
  },
  pos: {
    title: 'Positional signal',
    story: 'Position stamp',
    body: 'Attention is order-blind by construction, so position information must be added explicitly. The 2017 paper added fixed sinusoidal vectors; GPT learned position embeddings; modern models rotate queries and keys with RoPE inside attention itself.',
    shape: 'same shape as the embedding, added element-wise',
    module: 'tokenization-embeddings',
  },
  block: {
    title: 'Block, repeated N times',
    story: 'One editing pass',
    body: 'The repeating unit of the transformer: LayerNorm, attention, residual add, LayerNorm, MLP, residual add. The 2017 paper stacked 6; GPT-3 stacks 96. Everything a model "knows" is distributed across these blocks.',
    shape: 'shape unchanged: (seq, d_model) in and out',
    module: 'architecture',
  },
  ln: {
    title: 'LayerNorm',
    story: 'Calm the numbers',
    body: 'Rescales each token vector to a stable range so numbers stay well-conditioned through hundreds of layers. Modern models normalize before each sub-layer (pre-norm); the 2017 paper normalized after, which trains less stably.',
    shape: 'no effect on shape; keeps activations in range',
    module: 'architecture',
  },
  attn: {
    title: 'Multi-head self-attention (causal)',
    story: 'Editors discuss',
    body: 'The communication step. Every token computes queries, keys, and values; scores every earlier token with dot products; softmaxes the scores into weights; and replaces its vector with a weighted mix of values. The causal mask hides future positions so the model cannot peek ahead. GPT-3: 96 heads of 128 dims each.',
    shape: 'Q, K, V: (seq, d_model); scores: (heads, seq, seq)',
    module: 'attention',
  },
  'enc-attn': {
    title: 'Self-attention (bidirectional)',
    story: 'Readers discuss openly',
    body: 'Identical mechanism to the decoder variant, but with no mask: every source token may attend to every other, forward and backward. This is what makes the encoder a reader that builds full-context representations.',
    shape: '2017 paper: 8 heads, d_model 512, d_head 64',
    module: 'attention',
  },
  residual: {
    title: 'Residual add',
    story: 'Sticky notes, never erase',
    body: 'The sub-layer output is added to its input instead of replacing it. The resulting identity path lets signals and gradients flow through the whole stack, which is what makes very deep transformers trainable.',
    shape: 'element-wise add; shapes unchanged',
    module: 'architecture',
  },
  mlp: {
    title: 'MLP (feed-forward)',
    story: 'Private rewrite',
    body: 'The computation step, applied to each position independently: expand to about 4x the width, pass through a non-linearity (GELU), project back. Roughly two-thirds of all parameters live in these layers, and much of a model\'s factual memory is believed to be stored here.',
    shape: 'two linears per layer: (d_model, 4*d_model) and back',
    module: 'architecture',
  },
  cross: {
    title: 'Cross-attention',
    story: 'Writer consults the reader',
    body: 'The bridge between the two towers. Queries come from the decoder stream; keys and values come from the encoder memory. The mask is fully open: every generated token may look at every source token. This is the only channel connecting decoder to encoder.',
    shape: 'queries from decoder; K, V from memory',
    module: 'architecture',
  },
  memory: {
    title: 'Encoder memory',
    story: "The reader's summary",
    body: 'The encoder\'s output vectors, one per source token, after all encoder layers. The decoder re-uses them at every layer through cross-attention: the encoder runs once, the decoder reads it forever.',
    shape: '(src_seq, d_model)',
    module: 'architecture',
  },
  shifted: {
    title: 'Target, shifted right',
    story: 'The draft so far',
    body: 'The decoder input is the target sequence shifted right with a begin-of-sequence token in front. Combined with the causal mask, this guarantees that predicting position i may only use positions before i.',
    shape: '(tgt_seq, d_model)',
    module: 'architecture',
  },
  unembed: {
    title: 'Unembedding (linear head)',
    story: 'Guess the next word',
    body: 'Projects each position\'s final vector onto the vocabulary: one score, called a logit, per possible next token. The weights are often tied to the embedding matrix (transposed).',
    shape: '(seq, d_model) becomes (seq, vocab_size)',
    module: 'architecture',
  },
  softmax: {
    title: 'Softmax and sampling',
    story: 'Pick one word, go again',
    body: 'Turns the last position\'s logits into a probability distribution over every token in the vocabulary. Sampling from it (with temperature, top-k, top-p) is what produces text, one token at a time.',
    shape: 'vocab_size probabilities summing to 1',
    module: 'what-is-an-llm',
  },
}

type StoryStage = { part: PartId; headline: string; caption: string }

const DEC_STORY: StoryStage[] = [
  { part: 'tokens', headline: 'Shorthand notes', caption: 'Your sentence is chopped into shorthand notes. The model never sees letters, just IDs: 2, 3, 4.' },
  { part: 'embed', headline: 'Meaning cards', caption: 'Each note becomes a meaning card: a list of numbers describing what the word means so far.' },
  { part: 'pos', headline: 'Position stamps', caption: 'Every card gets a position stamp, so "dog bites man" and "man bites dog" stay different.' },
  { part: 'attn', headline: 'Editors discuss', caption: 'Every word looks at the words before it and asks: how do you change my meaning? In GPT-3, 96 committees of 128 specialists do this at once.' },
  { part: 'mlp', headline: 'Private rewrite', caption: 'Each editor then rewrites their own card in private: no talking, just deep processing. Most of the model\'s memory lives in these rewrites.' },
  { part: 'block', headline: 'Another pass', caption: 'That is one editing pass. GPT-3 runs 96 of them: early passes sort out grammar, late passes plan what comes next.' },
  { part: 'unembed', headline: 'Guess the next word', caption: 'The final card for the last word is compared against every word in the vocabulary: 50,257 scores.' },
  { part: 'softmax', headline: 'Pick one, go again', caption: 'Scores become probabilities. Pick one word, staple it to the sentence, and the whole assembly line runs again.' },
]

const ENC_STORY: StoryStage[] = [
  { part: 'tokens', headline: 'The reader takes the source', caption: 'The source sentence, say "the cat sat", is chopped into shorthand notes, all at once.' },
  { part: 'embed', headline: 'Meaning cards for the reader', caption: 'Each note becomes a meaning card, stamped with its position.' },
  { part: 'enc-attn', headline: 'Readers discuss openly', caption: 'Every source word can see every other word, front to back. The reader builds a full understanding of the sentence.' },
  { part: 'memory', headline: "The reader's summary", caption: 'The reader files one summary card per source word. The writer will consult these forever; the reader never runs again.' },
  { part: 'shifted', headline: 'The writer starts a draft', caption: 'The writer begins with a begin-of-story token and writes one word at a time: "le", "chat"...' },
  { part: 'attn', headline: 'Writer reviews the draft', caption: 'Writer editors review their draft, but the causal mask means no peeking at words that do not exist yet.' },
  { part: 'cross', headline: 'Writer phones the reader', caption: 'For every word it writes, the writer consults the reader\'s summary cards. This is the only phone line between the two towers.' },
  { part: 'mlp', headline: 'Private rewrite', caption: 'Each writer editor rewrites their own card in private, six passes deep in the 2017 paper.' },
  { part: 'unembed', headline: 'Guess the next word', caption: 'The draft\'s last card scores every word in the French vocabulary.' },
  { part: 'softmax', headline: 'Pick one, keep writing', caption: '"assis" wins this time. Staple it to the draft and repeat until the sentence ends.' },
]

type Lens = 'story' | 'tech'

/** Box labels per lens. Minis are small: short single lines, sub only if wide. */
function labelsFor(part: PartId, lens: Lens, mini: boolean): { title: string; sub?: string } {
  if (mini) {
    const miniLabels: Partial<Record<PartId, { story: string; tech: string; sub?: string }>> = {
      ln: { story: 'tidy up', tech: 'LayerNorm' },
      attn: { story: 'Editors discuss', tech: 'Self-attention', sub: 'causal mask' },
      'enc-attn': { story: 'Readers discuss openly', tech: 'Self-attention', sub: 'bidirectional' },
      residual: { story: 'sticky notes', tech: 'residual +' },
      mlp: { story: 'Private rewrite', tech: 'MLP / FFN', sub: '4x, GELU' },
      cross: { story: 'Writer phones reader', tech: 'Cross-attention', sub: 'K, V: memory' },
    }
    const m = miniLabels[part]
    if (!m) return { title: lens === 'story' ? PARTS[part].story : PARTS[part].title }
    return { title: lens === 'story' ? m.story : m.tech, sub: m.sub }
  }
  const bigLabels: Partial<Record<PartId, { story: [string, string?]; tech: [string, string?] }>> = {
    tokens: { story: ['Shorthand notes', 'the, cat, sat'], tech: ['Tokens', '[2, 3, 4]'] },
    embed: { story: ['Meaning cards', 'one per token'], tech: ['Embedding lookup', 'row of W_e'] },
    pos: { story: ['Position stamp', 'knows word order'], tech: ['Positional signal', 'RoPE'] },
    memory: { story: ["Reader's summary", 'one card per word'], tech: ['Encoder memory', 'keys + values'] },
    shifted: { story: ['Draft so far', 'begin token first'], tech: ['Target shifted', 'begin token first'] },
    unembed: { story: ['Guess next word', 'score all 50,257'], tech: ['Unembedding', 'to vocab logits'] },
    softmax: { story: ['Pick one word', 'append, go again'], tech: ['Softmax: sampling', 'probabilities'] },
  }
  const b = bigLabels[part]
  if (!b) return { title: lens === 'story' ? PARTS[part].story : PARTS[part].title }
  const [title, sub] = lens === 'story' ? b.story : b.tech
  return { title, sub }
}

type BoxProps = {
  x: number
  y: number
  w: number
  h: number
  part: PartId
  lens: Lens
  mini?: boolean
  big?: boolean
  muted?: boolean
  highlight: boolean
  onPick: (p: PartId) => void
}

/** Shrink a font size until the text fits the box width (char-width estimate). */
function fitFont(text: string, boxW: number, base: number, min: number): number {
  const est = text.length * base * 0.52
  return est <= boxW - 6 ? base : Math.max(min, Math.floor((boxW - 6) / (text.length * 0.52)))
}

function Box({ x, y, w, h, part, lens, mini, big, muted, highlight, onPick }: BoxProps) {
  const { title, sub } = labelsFor(part, lens, !!mini)
  const stroke = highlight ? 'var(--color-accent)' : muted ? 'var(--color-border)' : 'var(--color-ink-muted)'
  const fill = highlight ? 'color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))' : 'var(--color-surface)'
  const baseTitle = big ? 12 : mini ? 9.5 : 11
  const baseSub = big ? 9 : mini ? 7.5 : 8.5
  const titleSize = fitFont(title, w, baseTitle, 6.5)
  const subSize = sub ? fitFont(sub, w, baseSub, 6) : baseSub
  return (
    <g onClick={() => onPick(part)} style={{ cursor: 'pointer' }} role="button" aria-label={`${title}: click for details`}>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={highlight ? 2 : 1.2} />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 2 : y + h / 2 + 3.5}
        textAnchor="middle"
        fontSize={titleSize}
        fill="var(--color-ink)"
        style={{ pointerEvents: 'none' }}
      >
        {title}
      </text>
      {sub && sub !== '' && (
        <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize={subSize} fill="var(--color-ink-muted)" style={{ pointerEvents: 'none' }}>
          {sub}
        </text>
      )}
    </g>
  )
}

function ResidDot({ x, y, highlight }: { x: number; y: number; highlight: boolean }) {
  return (
    <g
      onClick={() => undefined}
      style={{ cursor: 'default' }}
    >
      <circle
        cx={x}
        cy={y}
        r={9}
        fill={highlight ? 'color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))' : 'var(--color-surface)'}
        stroke={highlight ? 'var(--color-accent)' : 'var(--color-ink-muted)'}
        strokeWidth={highlight ? 2 : 1.2}
      />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fill="var(--color-ink)">+</text>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink-muted)" strokeWidth={1.2} markerEnd="url(#arrow)" />
}

function ShapeLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fontSize={8.5} fill="var(--color-ink-muted)" fontFamily="ui-monospace, monospace" textAnchor="middle">
      {text}
    </text>
  )
}

export function ArchitectureDiagram() {
  const [view, setView] = useState('Story mode')
  const [tower, setTower] = useState('Decoder-only (GPT)')
  const [sel, setSel] = useState<PartId>('attn')
  const [step, setStep] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)

  const isDec = tower.startsWith('Decoder')
  const lens: Lens = view.startsWith('Story') ? 'story' : 'tech'
  const stages = isDec ? DEC_STORY : ENC_STORY

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => {
      setStep((s) => {
        const next = (s ?? -1) + 1
        if (next >= stages.length) {
          setPlaying(false)
          return stages.length - 1
        }
        return next
      })
    }, 2800)
    return () => window.clearInterval(t)
  }, [playing, stages.length])

  useEffect(() => {
    setStep(null)
    setPlaying(false)
  }, [tower])

  const activePart: PartId | null = lens === 'story' && step !== null ? stages[step].part : null

  const pick = (p: PartId) => {
    setSel(p)
    const idx = lens === 'story' ? stages.findIndex((s) => s.part === p) : -1
    setStep(idx >= 0 ? idx : null)
    setPlaying(false)
  }

  const info = PARTS[sel]
  const stage = step !== null ? stages[step] : null
  const isHot = (p: PartId) => activePart === p || (!activePart && sel === p)

  return (
    <WidgetFrame
      title="The whole transformer, on one screen"
      subtitle="Story mode tells it with an editing-room analogy; technical mode shows real names and shapes. Click any box, or press play."
    >
      <div className="flex flex-col gap-2">
        <Tabs tabs={['Story mode', 'Technical mode']} active={view} onChange={setView} />
        <Tabs tabs={['Decoder-only (GPT)', 'Encoder-decoder (2017)']} active={tower} onChange={setTower} />
      </div>

      {lens === 'story' && (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Story controls">
          <button
            onClick={() => {
              if (!playing && (step === null || step >= stages.length - 1)) setStep(0)
              setPlaying((p) => !p)
            }}
            aria-pressed={playing}
            aria-label={playing ? 'Pause the story' : 'Play the story'}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
          >
            {playing ? '⏸ Pause' : '▶ Play the story'}
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              setStep((s) => Math.max(0, (s ?? 1) - 1))
            }}
            className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-ink transition hover:bg-surface-raised"
          >
            ◀ Back
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              setStep((s) => Math.min(stages.length - 1, (s ?? -1) + 1))
            }}
            className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-ink transition hover:bg-surface-raised"
          >
            Next ▶
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              setStep(null)
            }}
            className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-ink transition hover:bg-surface-raised"
          >
            ↺ Reset
          </button>
          <span className="font-mono text-xs text-ink-muted" aria-live="polite">
            {step !== null ? `scene ${step + 1}/${stages.length}` : 'press play, or click a box'}
          </span>
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface-raised/30 p-2">
        {isDec ? (
          <svg viewBox="0 0 1068 204" className="min-w-215 w-full" aria-label="Decoder-only transformer pipeline, left to right">
            <defs>
              <marker id="arrow" markerWidth={7} markerHeight={7} refX={6} refY={3.2} orient="auto">
                <path d="M0,0 L6.5,3.2 L0,6.4 z" fill="var(--color-ink-muted)" />
              </marker>
            </defs>

            {/* feedback loop: sampled word feeds back as input */}
            <polyline
              points="1008,56 1008,12 56,12 56,54"
              fill="none"
              stroke="var(--color-highlight)"
              strokeWidth={1.2}
              strokeDasharray="5 4"
              markerEnd="url(#arrow)"
              opacity={0.85}
            />
            <text x={340} y={9} fontSize={9} fill="var(--color-highlight)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'the picked word is stapled to the sentence and everything runs again' : 'sampled token feeds back as input (autoregression)'}
            </text>

            <Box x={10} y={58} w={92} h={56} part="tokens" lens={lens} big highlight={isHot('tokens')} onPick={pick} />
            <ShapeLabel x={56} y={134} text="(6 IDs)" />
            <Arrow x1={102} y1={86} x2={124} y2={86} />

            <Box x={128} y={28} w={110} h={46} part="embed" lens={lens} big highlight={isHot('embed')} onPick={pick} />
            <ShapeLabel x={183} y={150} text="(6, 12,288)" />
            <line x1={183} y1={74} x2={183} y2={86} stroke="var(--color-ink-muted)" strokeWidth={1.2} />
            <ResidDot x={183} y={94} highlight={isHot('pos')} />
            <Box x={128} y={106} w={110} h={38} part="pos" lens={lens} big highlight={isHot('pos')} onPick={pick} />
            <polyline points="238,125 250,125 250,88 258,88" fill="none" stroke="var(--color-ink-muted)" strokeWidth={1.2} markerEnd="url(#arrow)" />

            {/* the block: container + horizontal interior chain */}
            <rect x={262} y={28} width={470} height={132} rx={10} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} strokeDasharray="6 5" opacity={0.8} />
            <text x={497} y={46} textAnchor="middle" fontSize={10.5} fill="var(--color-accent)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'Editing pass x N (GPT-3: 96 passes)' : 'Block x N (GPT-3: N = 96)'}
            </text>
            {/* connector baseline through the interior */}
            <line x1={272} y1={112} x2={724} y2={112} stroke="var(--color-border)" strokeWidth={1.1} />
            <Box x={276} y={88} w={76} h={48} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={366} y={88} w={124} h={48} part="attn" lens={lens} mini highlight={isHot('attn')} onPick={pick} />
            <ResidDot x={504} y={112} highlight={isHot('residual')} />
            <Box x={526} y={88} w={76} h={48} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={616} y={88} w={96} h={48} part="mlp" lens={lens} mini highlight={isHot('mlp')} onPick={pick} />
            <ResidDot x={720} y={112} highlight={isHot('residual')} />
            <ShapeLabel x={497} y={178} text="shape never changes: (seq, d_model)" />
            <Arrow x1={738} y1={88} x2={748} y2={88} />

            <Box x={752} y={64} w={68} h={48} part="ln" lens={lens} big highlight={isHot('ln')} onPick={pick} />
            <Arrow x1={820} y1={88} x2={838} y2={88} />

            <Box x={842} y={58} w={100} h={60} part="unembed" lens={lens} big highlight={isHot('unembed')} onPick={pick} />
            <ShapeLabel x={892} y={138} text="(6, 50,257)" />
            <Arrow x1={942} y1={88} x2={958} y2={88} />

            <Box x={962} y={58} w={100} h={60} part="softmax" lens={lens} big highlight={isHot('softmax')} onPick={pick} />
            <ShapeLabel x={1012} y={138} text="sums to 1" />
          </svg>
        ) : (
          <svg viewBox="0 0 1068 476" className="min-w-215 w-full" aria-label="Encoder-decoder transformer, two horizontal lanes">
            <defs>
              <marker id="arrow" markerWidth={7} markerHeight={7} refX={6} refY={3.2} orient="auto">
                <path d="M0,0 L6.5,3.2 L0,6.4 z" fill="var(--color-ink-muted)" />
              </marker>
            </defs>

            {/* encoder lane */}
            <text x={164} y={14} textAnchor="middle" fontSize={11} fill="var(--color-accent)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'The reader' : 'Encoder: reads the source'}
            </text>
            <Box x={10} y={40} w={88} h={48} part="tokens" lens={lens} big highlight={isHot('tokens')} onPick={pick} />
            <Arrow x1={98} y1={64} x2={118} y2={64} />
            <Box x={122} y={40} w={106} h={48} part="embed" lens={lens} big highlight={isHot('embed')} onPick={pick} />
            <Arrow x1={228} y1={64} x2={248} y2={64} />

            <rect x={252} y={26} width={470} height={118} rx={10} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} strokeDasharray="6 5" opacity={0.8} />
            <text x={487} y={44} textAnchor="middle" fontSize={10.5} fill="var(--color-accent)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'Reading pass x N (2017: 6)' : 'Encoder layer x N (2017: N = 6)'}
            </text>
            <line x1={262} y1={86} x2={712} y2={86} stroke="var(--color-border)" strokeWidth={1.1} />
            <Box x={266} y={64} w={72} h={44} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={350} y={64} w={120} h={44} part="enc-attn" lens={lens} mini highlight={isHot('enc-attn')} onPick={pick} />
            <ResidDot x={484} y={86} highlight={isHot('residual')} />
            <Box x={506} y={64} w={72} h={44} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={590} y={64} w={100} h={44} part="mlp" lens={lens} mini highlight={isHot('mlp')} onPick={pick} />
            <ResidDot x={704} y={86} highlight={isHot('residual')} />
            <ShapeLabel x={487} y={160} text="(src, 512) shape unchanged" />
            <Arrow x1={722} y1={64} x2={742} y2={64} />

            <Box x={746} y={40} w={120} h={48} part="memory" lens={lens} big highlight={isHot('memory')} onPick={pick} />
            <ShapeLabel x={764} y={104} text="(src, 512)" />

            {/* decoder lane */}
            <text x={164} y={278} textAnchor="middle" fontSize={11} fill="var(--color-highlight)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'The writer' : 'Decoder: writes the target'}
            </text>
            <Box x={10} y={304} w={88} h={48} part="shifted" lens={lens} big highlight={isHot('shifted')} onPick={pick} />
            <Arrow x1={98} y1={328} x2={118} y2={328} />
            <Box x={122} y={304} w={106} h={48} part="embed" lens={lens} big highlight={isHot('embed')} onPick={pick} />
            <Arrow x1={228} y1={328} x2={248} y2={328} />

            <rect x={252} y={290} width={620} height={118} rx={10} fill="none" stroke="var(--color-highlight)" strokeWidth={1.2} strokeDasharray="6 5" opacity={0.8} />
            <text x={380} y={308} textAnchor="middle" fontSize={10.5} fill="var(--color-highlight)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'Writing pass x N (2017: 6)' : 'Decoder layer x N (2017: N = 6)'}
            </text>
            <line x1={262} y1={350} x2={862} y2={350} stroke="var(--color-border)" strokeWidth={1.1} />
            <Box x={264} y={328} w={60} h={44} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={336} y={328} w={110} h={44} part="attn" lens={lens} mini highlight={isHot('attn')} onPick={pick} />
            <ResidDot x={458} y={350} highlight={isHot('residual')} />
            <Box x={480} y={328} w={60} h={44} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={552} y={328} w={120} h={44} part="cross" lens={lens} mini highlight={isHot('cross')} onPick={pick} />
            <ResidDot x={686} y={350} highlight={isHot('residual')} />
            <Box x={708} y={328} w={60} h={44} part="ln" lens={lens} mini highlight={isHot('ln')} onPick={pick} />
            <Box x={778} y={328} w={86} h={44} part="mlp" lens={lens} mini highlight={isHot('mlp')} onPick={pick} />
            <ShapeLabel x={562} y={424} text="(tgt, 512) shape unchanged" />
            <Arrow x1={872} y1={328} x2={892} y2={328} />

            <Box x={896} y={304} w={74} h={48} part="unembed" lens={lens} big highlight={isHot('unembed')} onPick={pick} />
            <Arrow x1={970} y1={328} x2={988} y2={328} />
            <Box x={992} y={302} w={70} h={52} part="softmax" lens={lens} big highlight={isHot('softmax')} onPick={pick} />
            <ShapeLabel x={1027} y={370} text="sums to 1" />

            {/* memory -> cross-attention bridge */}
            <polyline
              points="806,88 806,246 612,246 612,322"
              fill="none"
              stroke="var(--color-primary-bright)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              markerEnd="url(#arrow)"
            />
            <text x={618} y={264} fontSize={9.5} fill="var(--color-primary-bright)" fontFamily="ui-monospace, monospace">
              {lens === 'story' ? 'the writer consults the summary, every pass' : 'keys + values into cross-attention'}
            </text>
          </svg>
        )}
      </div>

      {/* Info panel: story scene or clicked-part details */}
      <div className="mt-3 rounded-lg border border-border bg-surface p-3" aria-live="polite">
        {lens === 'story' && stage ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-ink">
                {step! + 1}. {stage.headline}
              </h4>
              <span className="font-mono text-[10px] text-ink-muted">{info.shape}</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-ink/90">{stage.caption}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">In technical terms: {info.body}</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-ink">{lens === 'story' ? info.story : info.title}</h4>
              <span className="font-mono text-[10px] text-ink-muted">{info.shape}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-ink/85">{info.body}</p>
          </>
        )}
        <p className="mt-1.5 text-xs">
          Deep dive: <ModuleLink id={info.module} />
        </p>
      </div>
    </WidgetFrame>
  )
}
