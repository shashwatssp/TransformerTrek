import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'
import { ArchitectureFlow } from '../../widgets/transformer/ArchitectureFlow'
import { EncoderDecoderFlow } from '../../widgets/transformer/EncoderDecoderFlow'

const BLOCK_SNIPPET = `def block(x):                          # x: (seq_len, d_model)
    x = x + attention(layer_norm(x))   # pre-norm: attention sub-layer + residual
    x = x + mlp(layer_norm(x))         # pre-norm: feed-forward sub-layer + residual
    return x
# attention: h heads in parallel, concat, project back to d_model
# mlp:       Linear(d_model, 4*d_model) → GELU → Linear(4*d_model, d_model)
# stack N of these, then a final layer_norm → unembedding`

/**
 * Module 2.5: Transformer Architecture
 */
export default function Architecture() {
  return (
    <>
      {/* Step 1: The big picture: blocks in a stack */}
      <Prose>
        <H2>Step 1: The big picture: blocks in a stack</H2>
        <p>
          <ModuleLink id="attention">Module 2.4</ModuleLink> built attention as a mechanism. This
          module shows where it <em>lives</em>: inside a repeating block, stacked N times, between
          an embedding table and an output head. The full pipeline of a GPT-class model:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Embed</strong>, token IDs become vectors (<ModuleLink id="tokenization-embeddings">Module 2.3</ModuleLink>).</li>
          <li><strong>N identical blocks</strong>, each block is attention + an MLP, wrapped in residual connections.</li>
          <li><strong>Unembed</strong>, the last position's vector is projected to vocab size and softmaxed into next-token probabilities.</li>
        </ul>
        <p>
          That's the entire model, no recursion, no loops, no explicit rules. Watch the same six
          tokens travel through a two-block mini version below (press Play, or step manually; the
          final stage computes real softmax probabilities).
        </p>
      </Prose>
      <ArchitectureFlow />

      {/* Step 2: Inside a block: attention + MLP */}
      <Prose>
        <H2>Step 2: Inside a block: attention + MLP</H2>
        <p>
          Expand any block in the flow above and you'll see its two halves. They do different
          jobs:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Multi-head self-attention</strong>, the <em>communication</em> step: tokens
            look at each other and mix information across positions. Without it, each position is
            an isolated island.
          </li>
          <li>
            <strong>MLP (feed-forward)</strong>, the <em>computation</em> step: each position's
            vector is processed independently, expanded to ~4× its size, passed through a
            non-linearity (GELU), and projected back. Roughly two-thirds of a transformer's
            parameters live in these MLPs, and much of a model's factual "memory" is believed to
            be stored there.
          </li>
        </ul>
        <p>
          A useful mental model: attention decides <em>what</em> information each position pulls
          in; the MLP decides <em>what to do with it</em>. Communicate, then compute, repeat N
          times. The <a href="https://nlp.seas.harvard.edu/annotated-transformer/" target="_blank" rel="noopener noreferrer">Annotated Transformer</a>{' '}
          implements exactly this in executable PyTorch, line by line.
        </p>

        {/* Step 3: Residual connections and LayerNorm */}
        <H2>Step 3: Residual connections and LayerNorm</H2>
        <p>
          Two unglamorous details make deep stacks trainable at all. <strong>Residual
          connections</strong> add each sub-layer's output to its input instead of replacing it:
        </p>
        <CodeBlock language="python" filename="transformer_block.py" code={BLOCK_SNIPPET} />
        <p>
          The addition creates an unobstructed path from the output back to the input, gradients
          can flow through hundreds of blocks without vanishing, and any block that isn't yet
          useful can learn to output ~0 and stay out of the way. <strong>LayerNorm</strong>
          rescales each token's vector to a standard range before each sub-layer, keeping the
          numbers well-conditioned (this "pre-norm" arrangement is what modern models use; the
          2017 paper put it after the sub-layer, which trains less stably, one of several quiet
          changes between <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">the original transformer</a> and GPT-2-style models).
        </p>
        <Callout kind="math" title="Read the code like a novel">
          <span className="font-mono">x = x + attention(norm(x))</span>, "compute attention on a
          normalized copy, then stir it into the running stream." Every sub-layer in every
          transformer follows this shape; the residual stream is the model's version of working
          memory.
        </Callout>

        {/* Step 4: Encoder vs decoder vs decoder-only */}
        <H2>Step 4: Encoder vs decoder vs decoder-only</H2>
        <p>
          The 2017 paper had two towers, and each tower is just the block from Step 2 with a
          different attention mask. How each one works:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Encoder</strong>, the reader. Its self-attention is <em>bidirectional</em>:
            every input token may attend to every other input token, forward and backward. It
            builds a context-aware vector for each source token, and that output (the "memory") is
            its entire report to the decoder.
          </li>
          <li>
            <strong>Decoder</strong>, the writer. It generates left to right, so its
            self-attention is <em>causally masked</em>: position i may look only at positions ≤ i.
            And it has one extra sub-layer the encoder lacks: <strong>cross-attention</strong>,
            where queries come from the decoder, keys and values come from the encoder memory,
            with the mask fully open. That is the only channel connecting the two towers.
          </li>
          <li>
            <strong>Decoder-only</strong>, what every modern LLM actually is: the decoder tower
            alone, no encoder, no cross-attention, generating autoregressively from its own
            previous tokens.
          </li>
        </ul>
        <p>
          Step through the two towers below with a tiny translation example, and click a decoder
          token to trace exactly what its causal mask allows and what cross-attention can reach:
        </p>
      </Prose>
      <EncoderDecoderFlow />
      <Prose>
        <p>
          Every modern LLM you know descends from just one of those towers. The family
          tree:
        </p>
        <ComparisonTable
          columns={[
            { id: 'enc', label: 'Encoder-only' },
            { id: 'dec', label: 'Decoder-only' },
            { id: 'encdec', label: 'Encoder–decoder' },
          ]}
          rows={[
            {
              label: 'Attention mask',
              values: {
                enc: 'Bidirectional, every token sees the whole input',
                dec: 'Causal, token i sees only positions ≤ i',
                encdec: 'Bidirectional in the encoder; causal (plus cross-attention) in the decoder',
              },
            },
            {
              label: 'Native objective',
              values: {
                enc: 'Masked token prediction (BERT-style)',
                dec: 'Next-token prediction (GPT-style)',
                encdec: 'Sequence-to-sequence reconstruction (T5-style)',
              },
            },
            {
              label: 'Best at',
              values: {
                enc: 'Understanding: classification, embeddings, search',
                dec: 'Generation, the LLM shape',
                encdec: 'Transduction: translation, summarizing long inputs',
              },
            },
            {
              label: 'Today',
              values: {
                enc: 'Lives on as embedding/reranker models (see MiniLM)',
                dec: 'The dominant architecture for LLMs',
                encdec: 'Still strong for translation; fading for general LLMs',
              },
            },
          ]}
        />
        <p>
          Why did decoder-only win for LLMs? One objective (next-token) works for both training
          and generation; the causal mask lets a single model be trained on every position of a
          document simultaneously; and scale did the rest. The training recipes that fill these
          blocks with knowledge are the subject of <ModuleLink id="how-llms-are-trained" />. For
          the visual learner, the{' '}
          <a href="https://poloclub.github.io/transformer-explainer/" target="_blank" rel="noopener noreferrer">Transformer Explainer</a>{' '}
          animates this whole stack end to end.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'A transformer = embedding → N identical blocks (attention + MLP, each wrapped in residuals) → unembedding + softmax.',
          'Attention lets positions communicate; the MLP processes each position independently and holds most of the parameters.',
          'Residual connections give gradients a clear path through the stack; LayerNorm keeps activations well-scaled (pre-norm in modern models).',
          'The two towers talk through cross-attention: decoder queries against encoder keys/values, with the mask fully open.',
          'Encoder-only, decoder-only, and encoder–decoder differ mainly in the attention mask and training objective.',
          'Decoder-only won for LLMs: one objective, one stack, trainable on every position at once.',
        ]}
      />
    </>
  )
}