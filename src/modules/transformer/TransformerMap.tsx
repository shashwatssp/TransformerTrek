import {
  Callout,
  ComparisonTable,
  KeyTakeaways,
  ModuleLink,
  Prose,
  StepList,
  H2,
} from '../../components/ui'
import { ArchitectureDiagram } from '../../widgets/transformer/ArchitectureDiagram'

/**
 * Module 2.1: The Transformer, Mapped (section opener).
 * The one-page visual map of the whole architecture before the deep modules
 * dissect it. Hosts the clickable full-architecture diagram.
 */
export default function TransformerMap() {
  return (
    <>
      <Prose>
        <H2>Step 1: The whole model on one screen</H2>
        <p>
          Every transformer, from the 2017 original to the model you are chatting with today, is the same handful of
          parts arranged the same way. This module is the map of that territory: the complete architecture as one
          clickable diagram, with real tensor shapes. The modules after it (<ModuleLink id="tokenization-embeddings" />,{' '}
          <ModuleLink id="attention" />, <ModuleLink id="architecture" />) come back and dissect each piece.
        </p>
        <p>Read the diagram top to bottom, it is drawn in the order data flows:</p>
        <StepList
          steps={[
            'Text enters as tokens: integer IDs from the tokenizer.',
            'IDs become vectors: the embedding lookup, plus a positional signal.',
            'A block of LayerNorm, attention, residual, LayerNorm, MLP, residual repeats N times. This is where everything happens.',
            'The final vectors are projected onto the vocabulary (unembedding).',
            'Softmax turns logits into next-token probabilities, one token gets sampled, and the loop repeats.',
          ]}
        />
      </Prose>
      <ArchitectureDiagram />

      <Prose>
        <H2>Step 2: Follow the shapes</H2>
        <p>
          A surprisingly large share of understanding transformers is just knowing the shapes. Nothing changes size
          between blocks: that is the whole point of the residual stream. At GPT-3 scale, for a 6-token prompt:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Tokens</strong>: 6 integers from a vocabulary of 50,257.</li>
          <li><strong>Embeddings</strong>: a 6 × 12,288 matrix, one 12,288-dim vector per token.</li>
          <li><strong>Each block</strong>: attention and MLPs operate on that same 6 × 12,288 matrix and return it unchanged in shape.</li>
          <li><strong>Attention scores</strong>: per head, a 6 × 6 grid of pairwise scores; 96 heads in parallel.</li>
          <li><strong>Unembedding</strong>: 6 × 12,288 becomes 6 × 50,257: one logit row per position.</li>
          <li><strong>Softmax</strong>: the last row becomes 50,257 probabilities summing to 1. Sample one, append, repeat.</li>
        </ul>
        <Callout kind="math" title="Everything you generate is that last loop">
          Logits to softmax to sample, append the token, run the whole stack again. Chat, code, agents: all of it is
          this loop plus engineering around it (see <ModuleLink id="how-llms-work" />).
        </Callout>

        <H2>Step 3: Two towers or one?</H2>
        <p>
          Switch the diagram to the <strong>Encoder-decoder (2017)</strong> view. The encoder reads the source with
          bidirectional attention and hands its output (the memory) to the decoder, which writes the target with a
          causal mask plus cross-attention. The three families differ only in which of these pieces survive:
        </p>
        <ComparisonTable
          columns={[
            { id: 'map', label: 'Transformer-map view' },
            { id: 'family', label: 'Modern examples' },
          ]}
          rows={[
            {
              label: 'Decoder-only (right tower alone)',
              values: {
                map: 'Causal self-attention, no cross-attention, no memory',
                family: 'GPT, Claude, Llama, Mistral: every modern chat LLM',
              },
            },
            {
              label: 'Encoder-only (left tower alone)',
              values: {
                map: 'Bidirectional attention, no unembedding head',
                family: 'BERT, MiniLM: understanding, embeddings, search',
              },
            },
            {
              label: 'Both towers (full diagram)',
              values: {
                map: 'Memory flowing from encoder to decoder via cross-attention',
                family: 'Original 2017 model, T5, Whisper: translation and transduction',
              },
            },
          ]}
        />
        <p>
          Keep this map in mind as you continue: the next modules unpack it piece by piece. When you meet a new idea
          (KV cache, MoE, RoPE), the first question is always "where does it sit in this diagram?"
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'A transformer is: tokens, embeddings + positional signal, N identical blocks, unembedding, softmax.',
          'Block shape never changes through the stack; that is what makes stacking to 96 layers possible.',
          'The three families (encoder-only, decoder-only, encoder-decoder) differ only in attention masks and which towers they keep.',
          'Cross-attention is the only channel between the towers; decoder-only models do without it.',
        ]}
      />
    </>
  )
}
