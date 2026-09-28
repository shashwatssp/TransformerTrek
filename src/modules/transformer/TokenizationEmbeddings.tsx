import { useState } from 'react'
import {
  Callout,
  CodeBlock,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
  StepList,
  WidgetFrame,
} from '../../components/ui'
import { TokenizerPlayground } from '../../widgets/transformer/TokenizerPlayground'
import { EmbeddingBuilder } from '../../widgets/transformer/EmbeddingBuilder'
import { DimensionLab } from '../../widgets/transformer/DimensionLab'
import { ModelDimensions } from '../../widgets/transformer/ModelDimensions'
import { cosineSimilarity } from '../../lib/math'

const BPE_SNIPPET = `# BPE training: grow the vocabulary, most-frequent-pair first
vocab = list("abcdefghijklmnopqrstuvwxyz")          # start from characters
for _ in range(num_merges):                          # e.g. 50,000 merges
    pair = most_frequent_pair(corpus, vocab)         # count adjacent token pairs
    vocab.append(pair[0] + pair[1])                  # merge the winner into one token
# afterwards: tokenize(text) = greedy longest-match against the learned vocab`

const EMBED_SNIPPET = `import torch
embedding = torch.nn.Embedding(vocab_size, d_model)   # a learnable table: 50k × 768
ids = tokenizer("attention is all you need")          # → [3013, 4, 102, 291, 306, 272]
x = embedding(ids)                                    # → (6, 768) dense matrix
# x is what the transformer actually computes on, position info gets added next`

// ── EmbeddingPeek: two 4-dim vectors with live cosine similarity ──────────
const DIM_NAMES = ['royalty', 'gender', 'animal', 'size']
const BASE: Record<string, number[]> = {
  king: [0.9, 0.7, 0.1, 0.3],
  queen: [0.9, -0.7, 0.1, 0.3],
  cat: [0.0, 0.1, 0.95, 0.2],
}

function EmbeddingPeek() {
  const [a, setA] = useState('king')
  const [b, setB] = useState('cat')
  const vecA = BASE[a]
  const vecB = BASE[b]
  const sim = cosineSimilarity(vecA, vecB)

  const Picker = ({ side, value, onChange }: { side: string; value: string; onChange: (w: string) => void }) => (
    <div role="radiogroup" aria-label={`${side} word`} className="flex flex-wrap gap-1.5">
      {Object.keys(BASE).map((w) => (
        <button
          key={w}
          role="radio"
          aria-checked={value === w}
          onClick={() => onChange(w)}
          className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
            value === w
              ? 'border-accent/60 bg-accent/15 text-accent'
              : 'border-border text-ink-muted hover:text-ink'
          }`}
        >
          {w}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      <Picker side="First embedding" value={a} onChange={setA} />
      <Picker side="Second embedding" value={b} onChange={setB} />
      <div className="grid gap-3 sm:grid-cols-2">
        {[vecA, vecB].map((v, vi) => (
          <div key={vi} className="rounded-lg border border-border bg-surface-raised/30 p-3">
            <div className="font-mono text-xs text-accent">{vi === 0 ? a : b}</div>
            <ul className="mt-2 space-y-1">
              {v.map((x, di) => (
                <li key={di} className="flex items-center gap-2 text-[11px]">
                  <span className="w-14 text-ink-muted">{DIM_NAMES[di]}</span>
                  <span className="relative h-2 flex-1 rounded bg-surface">
                    <span
                      className={`absolute inset-y-0 left-0 rounded ${x >= 0 ? 'bg-accent' : 'bg-danger'}`}
                      style={{ width: `${Math.abs(x) * 50}%` }}
                    />
                  </span>
                  <span className="w-10 text-right font-mono text-ink">{x.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink" aria-live="polite">
        cosine similarity = <span className="font-mono text-accent">{sim.toFixed(3)}</span>
        <span className="ml-2 text-xs text-ink-muted">
          {sim > 0.7 ? ', near 1: pointing the same way (similar meaning in this toy space)' : sim > 0.2 ? ', somewhat related' : ', near 0: little to do with each other'}
        </span>
      </p>
      <p className="text-[11px] leading-5 text-ink-muted">
        These are hand-set 4-dim vectors so you can read every number. A real embedding has 768+
        dims learned from data, but similarity is computed exactly like this, via
        cos(θ) = (a·b)/(|a||b|). Vector search (<ModuleLink id="vector-search" />) is built on this
        one formula.
      </p>
    </div>
  )
}

/**
 * Module 2.3: Tokenization & Embeddings
 */
export default function TokenizationEmbeddings() {
  return (
    <>
      {/* Step 1: Characters → subwords → tokens */}
      <Prose>
        <H2>Step 1: Characters → subwords → tokens</H2>
        <p>
          A neural network computes on numbers, so before the transformer can do anything, text
          must become integers. The question is <em>at what granularity</em>. Three candidates:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Characters</strong>, tiny vocabulary (~100), but long sequences and each letter carries almost no meaning on its own.</li>
          <li><strong>Words</strong>, meaningful units, but the vocabulary explodes (every inflection, every language, every typo) and new words are impossible.</li>
          <li><strong>Subwords</strong>, the compromise that won: frequent things become their own tokens; rare things decompose into reusable pieces.</li>
        </ul>
        <p>
          The tokenizer below runs a toy version live. Watch the chips: common words stay whole,
          the unusual one fractures, that's exactly the behavior that makes subwords scale to
          anything you type.
        </p>
      </Prose>
      <TokenizerPlayground />

      {/* Step 2: Byte-pair encoding, step by step */}
      <Prose>
        <H2>Step 2: Byte-pair encoding, step by step</H2>
        <p>
          Where does the vocabulary come from? The standard answer is{' '}
          <strong>byte-pair encoding (BPE)</strong>, and the algorithm is almost embarrassingly
          simple (<a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noopener noreferrer">Sennrich et al., 2015</a>):
        </p>
        <CodeBlock language="python" filename="bpe_train.py" code={BPE_SNIPPET} />
        <p>
          Start with single characters; repeatedly find the most frequent adjacent pair and merge
          it into one new token. After ~50k merges, the vocabulary has grown exactly where the
          corpus is dense: common words become single tokens, rare words stay as sequences of
          pieces. Training data decides the vocabulary, nothing is hand-listed.
        </p>
        <p>
          Switch the widget above to <strong>Word splitter</strong> and type a word like{' '}
          <span className="font-mono">tokenizing</span>: it walks the greedy longest-match pass
          that BPE uses at inference time, always take the longest learned piece, fall back to
          smaller ones. Notice where it fails: that failure is a real property of greedy matching,
          and one reason modern tokenizers fall all the way back to raw bytes.
        </p>
        <Callout kind="info" title="Try the boundary cases">
          Type <span className="font-mono">attention</span> (one clean token in our toy vocab) vs{' '}
          <span className="font-mono">attenzione</span> (fractures). Real-world versions of this
          quirk: trailing spaces, capitalization, and numbers can all change the tokenization, 
          and therefore the model's behavior.
        </Callout>

        {/* Step 3: Vocab IDs and their blind spots */}
        <H2>Step 3: Vocab IDs and their blind spots</H2>
        <p>
          After tokenization, the text is a list of integers,{' '}
          <span className="font-mono">[3013, 4, 102, 291]</span>, and the model treats it as
          exactly that: categorical IDs with no inherent order or distance. ID 437 has no
          "numeric" relationship to ID 438; they could be completely unrelated words. All
          relationships must be <em>learned</em>.
        </p>
        <p>
          This encoding has well-known blind spots you may have met in practice. Models are worse
          at counting the letters in a word (they see token IDs, not letters). Multiplying large
          numbers is harder when digits group unpredictably into tokens. Typos can produce
          unexpected splits. Non-English languages are often over-penalized by vocabularies built
          from English-heavy corpora, their sentences cost more tokens, eating context window.
          None of these are reasoning failures; they're tokenization artifacts. The{' '}
          <a href="https://huggingface.co/docs/transformers/tokenizer_summary" target="_blank" rel="noopener noreferrer">Hugging Face tokenizer summary</a>{' '}
          catalogs the practical details across model families.
        </p>

        {/* Step 4: What exactly is an embedding? */}
        <H2>Step 4: What exactly is an embedding?</H2>
        <p>
          Categorical IDs are useless as inputs, you can't multiply "token 437" by a weight. The
          transformer's first real layer is an <strong>embedding table</strong>: a giant learnable
          matrix that maps every ID to a dense vector (typically 768–12,288 dimensions). But what
          does that actually mean, mechanically? Six small steps, each one visible:
        </p>
        <StepList
          steps={[
            'Raw text goes in, ordinary characters.',
            'The tokenizer splits it into subword tokens.',
            'Each token becomes its integer vocab ID.',
            'The ID is expressed as a one-hot row: one 1, rest zeros.',
            'The one-hot row multiplies the embedding matrix, which simply selects one row.',
            'That row is the embedding: a dense vector, one number per dimension.',
          ]}
        />
        <CodeBlock language="python" filename="embeddings.py" code={EMBED_SNIPPET} />
      </Prose>
      <EmbeddingBuilder />
      <Prose>
        <p>
          "Dense" is the operative word. In the one-hot, 49,999 of 50,000 numbers were zero and
          carried no information; in the dense vector, <em>every dimension participates in every
          computation</em>. During pretraining the model learns which directions of this space
          mean what. The classic result, from{' '}
          <a href="https://jalammar.github.io/illustrated-word2vec/" target="_blank" rel="noopener noreferrer">word2vec-era research</a>, 
          is that geometric proximity comes to track semantic similarity, so "directions" in the
          space encode features. A toy version you can actually read, number by number:
        </p>
      </Prose>
      <WidgetFrame
        title="Embedding peek"
        subtitle="Two 4-dim toy embeddings; similarity recomputed on every change with the real cosine formula."
      >
        <EmbeddingPeek />
      </WidgetFrame>

      <Prose>
        {/* Step 5: Dimensions: the detail dial */}
        <H2>Step 5: Dimensions: the detail dial</H2>
        <p>
          So what <em>is</em> a dimension? Each one is a direction in the vector space, and you can
          think of it as a <strong>feature slot</strong>: a number that records how strongly the
          token exhibits one learned concept. One slot might end up tracking gender, another
          animacy, another register or sentiment. Nobody assigns those meanings; training does.
          The lab below makes the slots <em>named</em> so you can watch them work:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Slide the <strong>dimension count</strong> and watch a live cosine matrix recompute: too few dimensions and unrelated words collide or collapse to zero.</li>
          <li>Pick a word <strong>pair</strong> and read the per-dimension contribution bars: they sum to the cosine exactly, which is what "dimensions contribute" means numerically.</li>
          <li>More dimensions = more (and more subtle) concepts representable: that is the whole sense in which "bigger embedding" means "more detailed".</li>
        </ul>
      </Prose>
      <DimensionLab />

      <Prose>
        {/* Step 6: How many dimensions do real models use? */}
        <H2>Step 6: How many dimensions do real models use?</H2>
        <p>
          The lab capped at 10 dimensions for readability. Real models use hundreds to tens of
          thousands: <strong>GPT-1 and BERT-base embed into 768 dims</strong>, GPT-2 XL into 1,600,
          and <strong>GPT-3 into 12,288 dims</strong> across 96 layers (96 attention heads of 128
          dims each, vocabulary 50,257; all published in{' '}
          <a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noopener noreferrer">the GPT-3 paper</a>, Table 2.1).{' '}
          <strong>Claude is different only in disclosure</strong>: it is also a decoder-only
          transformer, but Anthropic does not publish its dimensions, layer count, or parameter
          count, so any specific figure you see online is an unverified estimate. The reference
          below collects what is actually published, with sources:
        </p>
      </Prose>
      <ModelDimensions />

      <Prose>
        <H3>One more ingredient: position</H3>
        <p>
          An embedding table is a <em>lookup</em>, it knows what "cat" means but not where "cat"
          appeared. The transformer computes on the whole sequence at once, so position
          information must be injected explicitly (the original paper added sinusoidal vectors;
          modern models mostly use rotary embeddings). With token embeddings + position signal,
          the sequence is ready for <ModuleLink id="attention" />, where the real magic starts.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Subword tokenization is the compromise between character-level and word-level vocabularies.',
          'BPE trains by repeatedly merging the most frequent adjacent pair, the vocabulary emerges from the corpus.',
          'Tokens are opaque categorical IDs; their blind spots (spelling, digits, multilingual cost) are encoding artifacts, not reasoning failures.',
          'An embedding is created by a matrix lookup: token ID → row of the embedding table, a dense vector where every dimension is live.',
          'A dimension is a feature slot; similarities decompose into per-dimension contributions, and more dimensions mean more concepts representable.',
          'Real widths: 768 (BERT-base, GPT-1) to 12,288 (GPT-3); Claude is decoder-only but its dimensions are not publicly disclosed.',
          'Position information must be added explicitly; embeddings alone are order-blind.',
        ]}
      />
    </>
  )
}