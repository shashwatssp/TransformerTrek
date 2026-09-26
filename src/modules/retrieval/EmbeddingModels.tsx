/**
 * Module 4.7: Embedding Models, Compared
 * Body content follows the registry steps for id 'embedding-models'.
 * Benchmark and pricing figures are approximate and labeled as such:
 * this landscape shifts monthly, the method for choosing does not.
 */
import {
  Callout,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'
import { extClass } from '../../widgets/retrieval/shared'


const th = 'py-1 pr-3 font-medium text-left'
const td = 'py-1.5 pr-3 text-left align-top'

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={extClass} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export default function EmbeddingModels() {
  return (
    <>
      <Prose>
        <p>
          <ModuleLink id="minilm" /> dissected one model end to end. This module zooms out to the
          market: the sentence-embedding models you can actually ship with, from free open weights
          to paid APIs. The dimensions that matter are the same everywhere: retrieval quality
          (MTEB), vector size, input context, price, license, and language coverage. Numbers below
          are approximate snapshots from the <Ext href="https://huggingface.co/spaces/mteb/leaderboard">MTEB leaderboard</Ext>{' '}
          and vendor docs; the selection method at the end is the durable part.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
      <H2>Step 1: What to measure: dims, context, cost, recall</H2>
      <Prose>
        <p>
          Four properties decide whether an embedding model fits your system:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li>
            <strong>Retrieval quality.</strong> The{' '}
            <Ext href="https://arxiv.org/abs/2210.07316">MTEB</Ext> benchmark aggregates retrieval,
            clustering, and similarity tasks into one score. Treat it as a shortlist filter, not a
            verdict: a model three points ahead on MTEB can lose on <em>your</em> queries. The
            honest metric is recall@k computed on your own labeled questions.
          </li>
          <li>
            <strong>Vector dimension.</strong> Storage and ANN latency scale with it. 384 dims
            (MiniLM) is 8x cheaper to store than 3072 dims (text-embedding-3-large) at the same
            document count. Dimension is the knob <ModuleLink id="vector-databases" /> bills you for.
          </li>
          <li>
            <strong>Context window.</strong> 512 tokens forces chunking (and rewards models that
            see whole documents); 8K covers most pages; 32K+ swallows entire files. Long context
            does not mean the model <em>retrieves</em> well across it: many models pay attention
            tax in the middle.
          </li>
          <li>
            <strong>Cost and license.</strong> APIs charge per million tokens (and see your data);
            open weights cost inference hardware but keep data local. Licenses range from
            Apache-2.0 to non-commercial.
          </li>
        </ul>
        <Callout kind="tip" title="Where embedding quality actually comes from">
          The model is one leg of the stool. Chunking strategy, prompt prefixes ("query:" vs
          "passage:" for E5-style models), and the similarity metric all move recall as much as
          swapping models. Change one variable at a time and measure.
        </Callout>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
      <H2>Step 2: The open-source workhorses</H2>
      <Prose>
        <p>
          These run on your own hardware, including a laptop for the small ones. Quality per dollar
          is unbeatable; you trade it for operational work (serving, scaling, updating).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Open-source embedding model comparison</caption>
            <thead>
              <tr className="text-ink-muted">
                <th className={th}>Model</th>
                <th className={th}>Dims</th>
                <th className={th}>Context</th>
                <th className={th}>License</th>
                <th className={th}>Why pick it</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>all-MiniLM-L6-v2</td>
                <td className={td}>384</td>
                <td className={td}>512</td>
                <td className={td}>Apache-2.0</td>
                <td className={td + ' font-sans'}>The default demo model: tiny, fast, decent. Baseline in <ModuleLink id="minilm" />.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>all-mpnet-base-v2</td>
                <td className={td}>768</td>
                <td className={td}>512</td>
                <td className={td}>Apache-2.0</td>
                <td className={td + ' font-sans'}>The older, sturdier sibling: better quality than MiniLM, still cheap to run.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>E5 / multilingual-E5</td>
                <td className={td}>384 to 1024</td>
                <td className={td}>512</td>
                <td className={td}>MIT</td>
                <td className={td + ' font-sans'}>Strong on retrieval benchmarks; needs "query:"/"passage:" prefixes.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>BGE (BAAI)</td>
                <td className={td}>1024</td>
                <td className={td}>512 (m3: 8192)</td>
                <td className={td}>MIT</td>
                <td className={td + ' font-sans'}>bge-m3 does dense + sparse + multi-vector in one model, great multilingual hybrid.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>GTE (Alibaba)</td>
                <td className={td}>768 to 1024</td>
                <td className={td}>512 to 8192</td>
                <td className={td}>Apache-2.0</td>
                <td className={td + ' font-sans'}>Consistent all-rounder family, from tiny to large.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>nomic-embed-text</td>
                <td className={td}>768</td>
                <td className={td}>8192</td>
                <td className={td}>Apache-2.0</td>
                <td className={td + ' font-sans'}>First fully open model with long context; v1.5 adds Matryoshka.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Qwen3-Embedding</td>
                <td className={td}>1024 to 4096</td>
                <td className={td}>32K</td>
                <td className={td}>Apache-2.0</td>
                <td className={td + ' font-sans'}>Frontier open quality (0.6B to 8B sizes), 100+ languages, instruction-aware.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Dims and context are per model variant; check the model card before committing. The{' '}
          <Ext href="https://huggingface.co/models?pipeline_tag=sentence-similarity&sort=trending">
            sentence-similarity leaderboard
          </Ext>{' '}
          on Hugging Face tracks community favorites.
        </p>
      </Prose>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
      <H2>Step 3: The API flagships</H2>
      <Prose>
        <p>
          Hosted models buy you zero ops, long contexts, and frontier quality. You pay per token
          and route embeddings (and their text) through a vendor.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Hosted embedding model comparison</caption>
            <thead>
              <tr className="text-ink-muted">
                <th className={th}>Model</th>
                <th className={th}>Dims</th>
                <th className={th}>Context</th>
                <th className={th}>Price (approx)</th>
                <th className={th}>Why pick it</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>OpenAI text-embedding-3-small</td>
                <td className={td}>1536</td>
                <td className={td}>8191</td>
                <td className={td}>~$0.02 / M tok</td>
                <td className={td + ' font-sans'}>The pragmatic default API: cheap, fast, solid quality.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>OpenAI text-embedding-3-large</td>
                <td className={td}>3072</td>
                <td className={td}>8191</td>
                <td className={td}>~$0.13 / M tok</td>
                <td className={td + ' font-sans'}>Better recall, Matryoshka-truncatable down to 256 dims.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Cohere embed-v4</td>
                <td className={td}>1536 (MRL)</td>
                <td className={td}>long docs</td>
                <td className={td}>~$0.12 / M tok</td>
                <td className={td + ' font-sans'}>Multimodal (text + images), long inputs, enterprise focus.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Voyage voyage-3-large</td>
                <td className={td}>2048 (MRL)</td>
                <td className={td}>32K</td>
                <td className={td}>~$0.18 / M tok</td>
                <td className={td + ' font-sans'}>Retrieval specialist, strong on code; embeds Anthropic's search tools.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Jina embeddings v3/v4</td>
                <td className={td}>1024 (MRL)</td>
                <td className={td}>8192</td>
                <td className={td}>usage-based</td>
                <td className={td + ' font-sans'}>Task LoRA adapters (retrieval, clustering); v4 is multimodal; weights are non-commercial.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Gemini text-embedding-001</td>
                <td className={td}>3072 (MRL)</td>
                <td className={td}>8K</td>
                <td className={td}>free tier</td>
                <td className={td + ' font-sans'}>Top-tier multilingual quality with a generous free quota, easy to try.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Prices are published list rates at the time of writing and change often; verify before
          budgeting. All of these vendors process your text on their infrastructure, which matters
          for compliance-sensitive corpora.
        </p>
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
      <H2>Step 4: Matryoshka: one vector, many sizes</H2>
      <Prose>
        <p>
          <Ext href="https://arxiv.org/abs/2205.13147">Matryoshka Representation Learning (MRL)</Ext>{' '}
          trains embedding vectors so that every <em>prefix</em> of the vector is still a usable
          embedding. Take a 3072-dim model, keep the first 512 components, renormalize, and you
          retain most of the recall at a sixth of the storage. OpenAI's v3 models, Voyage, Jina,
          Gemini, and Nomic v1.5 all ship it.
        </p>
        <p>
          The production pattern: embed once at full dimension, then choose storage tiers. Keep
          256-dim prefixes for the fast first-pass ANN search in <ModuleLink id="vector-search" />,
          rerank the survivors with a cross-encoder (<ModuleLink id="hybrid-search" />) using the
          full vectors. You get the speed of a small model with quality closer to the large one,
          and you never re-embed the corpus when you change your mind.
        </p>
        <Callout kind="math" title="Why it works">
          MRL puts the most information in the leading dimensions during training (the loss is a
          weighted sum over truncated prefixes). Geometry stays roughly nested: coarse semantics
          early, fine distinctions later, like zooming out of a map.
        </Callout>
      </Prose>

      {/* ── Step 5 ─────────────────────────────────────────────── */}
      <H2>Step 5: How to choose: a decision guide</H2>
      <Prose>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Prototype or side project:</strong> MiniLM-L6 locally, or an API model with a free tier (Gemini). Optimizing model choice before the product works is premature.</li>
          <li><strong>Production, data must stay in-house:</strong> Qwen3-Embedding or bge-m3 self-hosted; both are Apache/MIT and multilingual with long context.</li>
          <li><strong>Production, API is fine:</strong> text-embedding-3-small to start; upgrade to 3-large or Voyage only if your recall@10 tests say so.</li>
          <li><strong>Code search or technical docs:</strong> Voyage (it embeds for Anthropic's retrieval tooling) or Qwen3.</li>
          <li><strong>Multimodal (text + images in one space):</strong> Cohere embed-v4 or Jina v4.</li>
          <li><strong>Long documents you dislike chunking:</strong> Nomic v1.5, bge-m3, or Qwen3 (8K to 32K context), but still measure mid-document retrieval.</li>
        </ul>
        <p>
          Whatever you pick, run the same five-minute experiment: assemble 30 to 50 real queries
          with known-answer documents, embed the corpus with each candidate, and compute
          recall@10. Embedding choice compounds with chunking, the index in{' '}
          <ModuleLink id="vector-databases" />, and reranking, so re-measure after changing any of
          them. Benchmarks rank models; your queries decide.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Judge embedding models on four axes: retrieval quality (MTEB as shortlist, recall@10 on your data as verdict), vector dimension, context window, and cost/license.',
          'Open weights (MiniLM, E5, BGE, Qwen3) win on cost per query and data locality; APIs (OpenAI, Cohere, Voyage, Gemini) win on zero ops, long context, and frontier quality.',
          'Matryoshka training makes vector prefixes useful: embed once, store many sizes, pair small vectors with a reranker for speed plus quality.',
          'The model is one leg of the stool: chunking, prefixes, and the similarity metric move recall as much as the model swap does.',
        ]}
      />
    </>
  )
}
