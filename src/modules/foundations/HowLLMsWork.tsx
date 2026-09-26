import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'
import { NextTokenSampler } from '../../widgets/transformer/NextTokenSampler'

const LOOP_SNIPPET = `def generate(prompt, max_new_tokens=100, temperature=0.8):
    tokens = tokenize(prompt)
    for _ in range(max_new_tokens):
        ctx = tokens[-context_limit:]        # 1. slide the context window
        logits = model(ctx)[-1]              # 2. one forward pass → logits for the NEXT token
        probs = softmax(logits / temperature)  # 3. apply temperature, normalize
        next_id = sample(probs)              # 4. draw one token
        tokens.append(next_id)               # 5. feed it back in (autoregression)
        if next_id == EOS_TOKEN: break       # 6. stop when the model says so
    return detokenize(tokens)`

/**
 * Module 1.2 — How does an LLM work?
 */
export default function HowLLMsWork() {
  return (
    <>
      {/* Step 1 — The inference loop, end to end */}
      <Prose>
        <H2>Step 1 — The inference loop, end to end</H2>
        <p>
          <ModuleLink id="what-is-an-llm">Module 1.1</ModuleLink> established that an LLM predicts
          the next token. This module is about the machinery around that prediction — the{' '}
          <strong>inference loop</strong> that turns "one guess" into "a whole answer". In
          pseudocode, the entire system fits in a dozen lines:
        </p>
        <CodeBlock language="python" filename="inference_loop.py" code={LOOP_SNIPPET} />
        <p>
          Every line hides an industry. Line 2 is the transformer itself (the{' '}
          <ModuleLink id="architecture">Architecture</ModuleLink> module opens it up). Line 4 is
          where randomness enters — the rest of this module. The loop is also why LLM latency is
          per-token: each generated token requires a full forward pass over the context.
        </p>
        <Callout kind="info" title="Pretraining vs inference">
          The loop above is <em>inference</em> — using the frozen model. Training computes the same
          forward pass, but instead of sampling, it measures how surprised the model was and nudges
          billions of weights. Same machine, different job.
        </Callout>

        {/* Step 2 — Context windows and their limits */}
        <H2>Step 2 — Context windows and their limits</H2>
        <p>
          The model can only attend to a fixed number of tokens at once — the{' '}
          <strong>context window</strong>. GPT-2 worked with 1,024 tokens (
          <a href="https://openai.com/index/better-language-models/" target="_blank" rel="noopener noreferrer">OpenAI, 2019</a>),
          and modern models stretch to hundreds of thousands — but the principle is unchanged:
          everything outside the window simply does not exist for the next prediction.
        </p>
        <p>
          This explains everyday LLM behavior. "Why did it forget the beginning of our chat?" — the
          beginning fell out of the window, or the app truncated it. "Why does it hallucinate my
          API's docs?" — the docs were never in the context, and the model filled the void with
          plausible tokens. Retrieval systems like <ModuleLink id="rag" /> exist precisely to stuff
          the right things <em>into</em> the window before generation starts.
        </p>

        {/* Step 3 — Temperature: controlling randomness */}
        <H2>Step 3 — Temperature: controlling randomness</H2>
        <p>
          Before sampling, logits are divided by a constant <strong>T</strong> (temperature), then
          softmaxed. T doesn't change <em>which</em> token is most likely — it changes how{' '}
          <em>peaky</em> the distribution is:
        </p>
        <Callout kind="math" title="The temperature rule">
          T → 0: distribution sharpens toward argmax (deterministic, but repetitive). T = 1: the
          model's honest distribution. T → ∞: flattens toward uniform (chaotic). It is one line of
          code with outsized personality effects.
        </Callout>
        <p>
          Drag the temperature slider below and watch "p after T" move: at T = 0.1 the top token
          approaches 100%; at T = 2 the tail fattens. Then sample at each extreme and feel the
          difference.
        </p>
      </Prose>
      <NextTokenSampler
        title="Temperature lab"
        subtitle="Only the temperature knob is active here — top-k / top-p come next."
        showTopK={false}
        showTopP={false}
      />
      <Prose>
        {/* Step 4 — Sampling strategies: top-k and top-p */}
        <H2>Step 4 — Sampling strategies: top-k and top-p</H2>
        <p>
          Temperature reshapes probabilities but still samples from the <em>whole</em> vocabulary —
          including tokens that are plausible-but-weird. Truncation strategies fix that by removing
          the tail before the die is cast:
        </p>
        <p>
          <strong>Top-k</strong> keeps only the k highest-probability tokens. Simple, but a fixed k
          is wrong in two regimes: when the model is confident (k = 50 keeps 50 near-duplicates of
          the obvious answer) and when it's torn (k = 50 keeps absolute junk).
        </p>
        <p>
          <strong>Top-p</strong> (nucleus sampling, introduced by{' '}
          <a href="https://arxiv.org/abs/1904.09751" target="_blank" rel="noopener noreferrer">Holtzman et al., 2019</a>)
          keeps the smallest set of tokens whose probabilities sum to at least p — an <em>adaptive</em>
          cut. Confident distribution: nucleus might be 2 tokens. Torn distribution: nucleus grows to
          include every reasonable option. That adaptivity is why top-p displaced top-k as the
          default.
        </p>
        <p>
          The full pipeline stacks all three: divide logits by T → softmax → keep top-k → keep the
          top-p nucleus → renormalize what survives. Only tokens that pass both filters can be
          sampled. The dedicated <ModuleLink id="next-token-lab" /> lab lets you run that exact
          pipeline end to end.
        </p>
        <ComparisonTable
          columns={[
            { id: 'greedy', label: 'Greedy (T≈0)' },
            { id: 'topk', label: 'Top-k' },
            { id: 'topp', label: 'Top-p (nucleus)' },
          ]}
          rows={[
            {
              label: 'How it picks',
              values: {
                greedy: 'Always the argmax token',
                topk: 'Randomly among the k highest-probability tokens',
                topp: 'Randomly among the smallest set with mass ≥ p',
              },
            },
            {
              label: 'Cut size',
              values: {
                greedy: 'Everything but the winner',
                topk: 'Fixed k — ignores the shape of the distribution',
                topp: 'Adaptive — widens only when the model is uncertain',
              },
            },
            {
              label: 'Failure mode',
              values: {
                greedy: 'Loops and repeated phrases',
                topk: 'Keeps junk when confident, or too few options when torn',
                topp: 'Can include many tokens when the distribution is flat',
              },
            },
            {
              label: 'Typical use',
              values: {
                greedy: 'Deterministic tasks: classification, extraction',
                topk: 'Legacy setting; still common combined with top-p',
                topp: 'Default for creative generation (often p = 0.9–0.95)',
              },
            },
          ]}
        />
        <p>
          These are the three dials of decoder behavior — everything else (beam search, min-p,
          repetition penalties) is refinement. For the rest of this trek, remember: the model
          produces a distribution; these knobs decide how you <em>read</em> it.{' '}
          <a href="https://jalammar.github.io/illustrated-gpt2/" target="_blank" rel="noopener noreferrer">The Illustrated GPT-2</a>{' '}
          visualizes the model producing those logits, and{' '}
          <a href="https://www.youtube.com/watch?v=kCc8FmEb1nY" target="_blank" rel="noopener noreferrer">Karpathy's build-from-scratch video</a>{' '}
          implements the whole loop in an afternoon.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Inference is a loop: window the context → forward pass → logits → temperature → sample → append.',
          'The context window is a hard boundary — tokens outside it cannot influence the output at all.',
          'Temperature divides logits before softmax: low T sharpens (deterministic), high T flattens (random).',
          'Top-k cuts to a fixed number of candidates; top-p cuts to an adaptive probability mass — usually the better default.',
          'Sampling knobs change how the distribution is read, never the model itself.',
        ]}
      />
    </>
  )
}