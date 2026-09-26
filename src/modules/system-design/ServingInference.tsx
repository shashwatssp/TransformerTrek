/**
 * Module 6.3: Serving & Inference
 * Body content follows the registry steps for id 'serving-inference'.
 */
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'

const KV_SNIPPET = `// KV-cache memory math, the bill behind "long context" (TypeScript)
function kvCacheBytes(opts: {
  layers: number
  kvHeads: number     // grouped-query models share K/V across query heads
  headDim: number
  tokens: number
  bytesPerElem?: number // 2 for bf16/fp16, 1 for int8, 0.5 for 4-bit
}) {
  const bytes = opts.bytesPerElem ?? 2
  // K and V are cached separately, hence the ×2
  const perToken = opts.layers * opts.kvHeads * opts.headDim * 2 * bytes
  return perToken * opts.tokens
}

// A 70B-class model (80 layers, 8 KV heads, 128 headDim) at 128K tokens,
// bf16: ~20 GB of cache for ONE user, the real cost of "long context".
console.log(kvCacheBytes({ layers: 80, kvHeads: 8, headDim: 128, tokens: 131072 }))
// → 21,474,836,480 bytes ≈ 20 GiB`

/**
 * Module 6.3: Serving & Inference
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline, sources).
 */
export default function ServingInference() {
  return (
    <>
      <Prose>
        <p>
          Every module so far treated the model as a function you call. This one is about what
          happens inside the serving stack, the part that decides what a token costs, how fast
          the first one arrives, and why "long context" is a memory bill. These are the questions
          that come up the moment an LLM app hits production, and they are pure architecture: no
          training required to understand them.
        </p>
      </Prose>

      {/* Step 1 */}
      <H2>Step 1: Prefill vs decode: two very different phases</H2>
      <Prose>
        <p>
          Inference has two phases with opposite personalities. <strong>Prefill</strong> processes
          your entire prompt in one parallel pass, every token at once, and produces the first
          output token. It is <em>compute-bound</em>: lots of matrix multiplication, GPUs love it.
          <strong> Decode</strong> is everything after: one token per forward pass, each depending
          on the last (the autoregressive loop from <ModuleLink id="what-is-an-llm" />). It is{' '}
          <em>memory-bandwidth-bound</em>: every step must read all the model weights to produce a
          single token, so the GPU spends its time streaming bytes, not multiplying them.
        </p>
        <p>
          That split explains the two latency numbers every LLM product watches:{' '}
          <strong>TTFT</strong> (time to first token, the prefill bill, growing with prompt
          length) and <strong>TPOT/ITL</strong> (time per output token, the decode bill, mostly
          constant). A summarizer over a 100-page PDF pays at TTFT; a chatty agent pays at TPOT.
          Optimization work differs by phase, so always ask which one you're actually fighting.
        </p>
      </Prose>

      {/* Step 2 */}
      <H2>Step 2: The KV cache: why the first token is the expensive one</H2>
      <Prose>
        <p>
          Recomputing attention over the whole prompt for every new token would make decode O(n²)
          in the worst way. Instead, the serving stack caches each layer's <strong>keys and
          values</strong> during prefill, so each decode step only computes the new token's K/V and
          attends over the cache. That's the <strong>KV cache</strong>, and it's why per-token
          decode is cheap after an expensive first token.
        </p>
        <p>
          The catch: the cache is <em>RAM</em>, it scales linearly with context length, and it's
          per sequence. Do the arithmetic once and "128K context" stops being a feature spec and
          starts being a hardware bill:
        </p>
      </Prose>
      <CodeBlock language="typescript" filename="kv_cache.ts" code={KV_SNIPPET} />
      <Prose>
        <p>
          This is the problem <a href="https://arxiv.org/abs/2309.06180" target="_blank" rel="noopener noreferrer">PagedAttention / vLLM</a>{' '}
          attacked: treat the cache like an OS treats virtual memory, fixed-size blocks, shared
          between sequences, no fragmentation, and serving throughput jumps dramatically. When an
          interviewer asks "why is the first token slower?" or "how does long context cost RAM?",
          this arithmetic <em>is</em> the answer.
        </p>
      </Prose>

      {/* Step 3 */}
      <H2>Step 3: Batching and continuous batching</H2>
      <Prose>
        <p>
          Decode is memory-bound, which means a GPU generating one sequence leaves most of its
          bandwidth idle, the weights are streamed once and used for one user. <strong>Batching</strong>
          amortizes that read across many concurrent sequences: one weight pass, many users' tokens.
          Naive batching waits for the slowest sequence in the batch before admitting anyone new;
          <strong> continuous batching</strong> swaps finished sequences out and new ones in at each
          step boundary, keeping the GPU saturated. It's the single biggest throughput lever in
          every serious serving stack, and the reason your API provider's per-token price has
          anything like economics at all.
        </p>
        <Callout kind="info" title="Latency vs throughput, again">
          Batching improves throughput and <em>hurts</em> your personal latency slightly (your
          tokens share the GPU). APIs hide this tradeoff; self-hosting forces you to pick it
          consciously per workload.
        </Callout>
      </Prose>

      {/* Step 4 */}
      <H2>Step 4: Quantization: fewer bits, faster decode</H2>
      <Prose>
        <p>
          Decode reads every weight on every token, so the weight format is the fuel bill.{' '}
          <strong>Quantization</strong> stores weights, and increasingly the KV cache, in INT8 or
          4-bit instead of 16-bit floats: a quarter of the memory (longer contexts per GPU, more
          room for batches) and a decode step that's proportionally faster, since the workload is
          memory-bound. The cost is a small accuracy loss that is task-dependent and must be
          measured, the eval discipline from <ModuleLink id="evals" />, applied to a numerical
          format. This is also the machinery behind QLoRA from <ModuleLink id="fine-tuning" /> and
          the quantized builds that let you run a 30B model on a laptop (see{' '}
          <ModuleLink id="open-source-models" />).
        </p>
      </Prose>

      {/* Step 5 */}
      <H2>Step 5: Speculative decoding and the latency levers</H2>
      <Prose>
        <p>
          One more trick closes the loop. <a href="https://arxiv.org/abs/2211.17192" target="_blank" rel="noopener noreferrer">Speculative decoding</a>{' '}
          uses a tiny draft model to propose several tokens ahead; the big model then verifies all
          of them in <em>one</em> parallel pass (cheap, because verification is prefill-shaped).
          Accepted tokens cost one step instead of several; rejections cost a little waste. Done
          right, decode throughput rises by 2-3× with the <em>exact same output distribution</em>,
          the big model still has veto power.
        </p>
        <p>
          Stack the levers from an engineer's chair: <strong>stream</strong> every response (TTFT
          is what users feel), <strong>cache</strong> prompt prefixes you reuse (providers charge
          less; self-hosted stacks skip prefill), <strong>route</strong> easy requests to small
          models and only hard ones to frontier ones, and <strong>batch</strong> what isn't
          latency-critical. None of these change the model, they change how its two-phase,
          memory-bound reality maps onto your latency and cost budget. For where the money goes
          once requests get complex, see <ModuleLink id="agent-system-design" />.
        </p>

        <KeyTakeaways
          points={[
            'Prefill (parallel, compute-bound, produces the first token) and decode (one token at a time, memory-bound) are different workloads with different optimizations.',
            'The KV cache makes decode cheap and long context expensive: layers × KV-heads × head-dim × 2 × tokens × bytes, run the number for your model.',
            'Continuous batching amortizes weight reads across concurrent sequences, the core throughput lever of every serving stack.',
            'Quantization (INT8/4-bit weights and cache) cuts the memory bill of a memory-bound workload; measure the quality cost on your own evals.',
            'Speculative decoding buys 2-3× decode throughput with an unchanged output distribution: draft with a small model, verify with the big one.',
          ]}
        />
      </Prose>
    </>
  )
}
