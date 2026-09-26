import {
  Callout,
  CodeBlock,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'
import { AttentionPlayground } from '../../widgets/transformer/AttentionPlayground'

const ATTENTION_SNIPPET = `import math
scores  = [[sum(qi*kj for qi, kj in zip(q, k)) for k in K] for q in Q]
scores  = [[s / math.sqrt(d_head) for s in row] for row in scores]   # scale
masked  = [[s if j <= i else float("-inf") for j, s in enumerate(row)]
           for i, row in enumerate(scores)]                          # causal mask
weights = [softmax(row) for row in masked]                           # rows sum to 1
output  = [[sum(w[j] * v[d] for j, v in zip(weights_row, V))
            for d in range(d_head)] for weights_row in weights]      # weighted sum of values`

/**
 * Module 2.4: Attention, step by step (flagship).
 * The AttentionPlayground is introduced once in Step 2 and walked stage by
 * stage through Steps 3–6 (stage numbers match section numbers).
 */
export default function Attention() {
  return (
    <>
      {/* Step 1: The problem: one vector per word is not enough */}
      <Prose>
        <H2>Step 1: The problem: one vector per word is not enough</H2>
        <p>
          After <ModuleLink id="tokenization-embeddings">Module 2.3</ModuleLink>, each token is a
          fixed embedding vector. But "fixed" is the problem: the word <em>bank</em> gets the same
          vector in "I sat on the river bank" and "I transferred money to the bank". The meaning of
          a word <em>depends on its neighbors</em>, and a lookup table can't know its neighbors.
        </p>
        <p>
          What we want is a mechanism where each token's vector gets <em>updated using the other
          tokens around it</em>, differently in every sentence. That mechanism is attention, the
          core contribution of <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">"Attention Is All You Need" (Vaswani et al., 2017)</a>.
          The rest of this module builds it from nothing, one matrix at a time.
        </p>
        <Callout kind="info" title="The running example">
          We'll compute attention live on two sentences: "The cat chased the mouse" and "The bank
          of the river". With the same weights, <em>bank</em> will end up with a different output
          vector in each sentence, that is attention doing its job.
        </Callout>

        {/* Step 2: Queries, Keys, Values, the library metaphor */}
        <H2>Step 2: Queries, Keys, Values, the library metaphor</H2>
        <p>
          Attention gives every token three derived vectors, each produced by multiplying the
          token's embedding by a learned matrix:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Query (q)</strong>, "what am I looking for?" (a library patron's search slip)</li>
          <li><strong>Key (k)</strong>, "what do I contain?" (the label on each book's spine)</li>
          <li><strong>Value (v)</strong>, "what do I contribute if selected?" (the book's contents)</li>
        </ul>
        <p>
          Each token uses its <em>query</em> to compare against every token's <em>key</em>; how
          well they match determines how much of that token's <em>value</em> it absorbs. Crucially,
          the three matrices W_Q, W_K, W_V are <em>learned</em>, training shapes what "looking
          for" and "containing" even mean.
        </p>
        <p>
          The playground below runs real attention math on 4-dimensional toy embeddings. Press
          <strong> Stage 1 · Q, K, V</strong> (or just read the table): every token's three
          vectors, computed live in your browser from a fixed seed. Pick a row to inspect, 
          we'll follow that row through the remaining steps.
        </p>
      </Prose>
      <AttentionPlayground />

      {/* Step 3: Scores: dot products, row by row */}
      <Prose>
        <H2>Step 3: Scores: dot products, row by row</H2>
        <p>
          Stage 2 of the playground shows the raw comparison. For each pair of tokens (i, j), the
          score is the dot product of query i with key j, divided by √d (d = key dimension, 
          here 4, in real models more like 64–128):
        </p>
        <Callout kind="math" title="score(i, j) = (q_i · k_j) / √d">
          The dot product measures alignment: big when the query points the same way as the key.
          Dividing by √d keeps the numbers from growing with dimension, which would otherwise push
          softmax into saturation (see the temperature intuition from{' '}
          <ModuleLink id="how-llms-work" />).
        </Callout>
        <p>
          Do this for every pair and you get the n × n <strong>score matrix</strong>, row i says
          "how relevant is every token to token i?" In the playground, row "mouse" scores high
          against "chased" and "cat": those keys describe what the mouse was doing and who did it.
        </p>

        {/* Step 4: Softmax: turning scores into weights */}
        <H2>Step 4: Softmax: turning scores into weights</H2>
        <p>
          Scores can be any number, negative, huge, incomparable across rows. Softmax fixes that
          by exponentiating each row and normalizing: every row becomes a probability
          distribution over positions, summing to exactly 1. That's playground stage 3, where the
          selected row is also drawn as bars.
        </p>
        <p>
          Read a softmaxed row as attention <em>weights</em>: "token <em>mouse</em> spends most of
          its attention on <em>chased</em> and <em>cat</em>, a little on everything else". Check
          the exact split in the playground, the numbers are computed, not illustrated. Unlike
          the hard argmax, the soft version keeps a little weight everywhere, every token
          contributes something, in proportion. The same function that turns logits into
          next-token probabilities in <ModuleLink id="what-is-an-llm" /> is doing the mixing here.
        </p>

        {/* Step 5: Masking: what a decoder may not see */}
        <H2>Step 5: Masking: what a decoder may not see</H2>
        <p>
          One subtlety breaks the story for text generation: at training time the model sees the
          whole sentence at once, but at generation time the tokens after the current position
          <em> don't exist yet</em>. If rows could attend to the future, the model could "cheat", 
          reading tomorrow's token to predict today's.
        </p>
        <p>
          The fix is the <strong>causal mask</strong>: before softmax, every position j &gt; i in
          row i is set to −∞, so after softmax its weight is exactly 0. Playground stage 4 shows
          the upper triangle stamped out. This is the only difference between the transformer's
          encoder (bidirectional) and decoder (masked) variants, we disassemble the architecture
          family in <ModuleLink id="architecture" />.
        </p>

        {/* Step 6: Weighted sums: the output */}
        <H2>Step 6: Weighted sums: the output</H2>
        <p>
          Final assembly, playground stage 5: each token's new vector is the attention-weighted
          sum of everyone's value vectors. Token <em>mouse</em> ends up as a blend: a bit of{' '}
          <em>chased</em>, a bit of <em>cat</em>, a trace of everything else, its original,
          context-free embedding replaced by a context-aware one.
        </p>
        <CodeBlock language="python" filename="attention.py" code={ATTENTION_SNIPPET} />
        <H3>One head is not enough: multi-head attention</H3>
        <p>
          Flip the playground to the <strong>Multi-head</strong> tab. Instead of one Q/K/V
          triple, the transformer runs h of them in parallel with independent learned matrices, 
          12–96 heads in practice. Each head produces its own weight matrix and output; the
          outputs are concatenated and mixed by one more learned matrix. The toy heads already
          disagree, one tracks the verb, another tracks the subject, and nobody assigned those
          roles; they emerged from training. BertViz (
          <a href="https://github.com/jessevig/bertviz" target="_blank" rel="noopener noreferrer">github.com/jessevig/bertviz</a>)
          shows the same structure on real pretrained models, and the{' '}
          <a href="https://jalammar.github.io/illustrated-transformer/" target="_blank" rel="noopener noreferrer">Illustrated Transformer</a>{' '}
          / <a href="https://poloclub.github.io/transformer-explainer/" target="_blank" rel="noopener noreferrer">Transformer Explainer</a>{' '}
          cover the rest of the pipeline visually. When you're ready to see where these blocks
          live in the full model, continue to <ModuleLink id="architecture" />.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Attention fixes the static-embedding problem: each token is updated using its neighbors, differently per sentence.',
          'Every token produces a query ("what I want"), a key ("what I have"), and a value ("what I give") via learned matrices.',
          'Scores are scaled dot products q·k/√d; softmax turns each row into a probability distribution over positions.',
          'The causal mask (−∞ above the diagonal) is what makes decoder models able to generate without peeking at the future.',
          'The output for each token is a weighted sum of value vectors, context in, context out.',
          'Multi-head attention runs several such operations in parallel, each free to learn a different relationship.',
        ]}
      />
    </>
  )
}