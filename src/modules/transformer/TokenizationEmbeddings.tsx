import { useState } from 'react'
import {
  Callout,
  CodeBlock,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { TokenizerPlayground } from '../../widgets/transformer/TokenizerPlayground'
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

        {/* Step 4: From token IDs to dense embeddings */}
        <H2>Step 4: From token IDs to dense embeddings</H2>
        <p>
          Categorical IDs are useless as inputs, you can't multiply "token 437" by a weight. The
          transformer's first real layer is an <strong>embedding table</strong>: a giant learnable
          matrix that maps every ID to a dense vector (typically 768–12,288 dimensions).
        </p>
        <CodeBlock language="python" filename="embeddings.py" code={EMBED_SNIPPET} />
        <p>
          "Dense" is the operative word. Every dimension participates in every computation, and
          the model learns during pretraining which directions of this space mean what. The
          classic result, from{' '}
          <a href="https://jalammar.github.io/illustrated-word2vec/" target="_blank" rel="noopener noreferrer">word2vec-era research</a>, 
          is that geometric proximity comes to track semantic similarity, so "directions" in the
          space encode features. A toy version you can actually see:
        </p>
      </Prose>
      <WidgetFrame
        title="Embedding peek"
        subtitle="Two 4-dim toy embeddings; similarity recomputed on every change with the real cosine formula."
      >
        <EmbeddingPeek />
      </WidgetFrame>
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
          'An embedding table maps each ID to a dense learned vector, the space where meaning lives.',
          'Position information must be added explicitly; embeddings alone are order-blind.',
        ]}
      />
    </>
  )
}