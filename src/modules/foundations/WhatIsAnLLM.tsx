import {
  Callout,
  CodeBlock,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'
import { NextTokenSampler } from '../../widgets/transformer/NextTokenSampler'
import { TokenizerPlayground } from '../../widgets/transformer/TokenizerPlayground'

const SOFTMAX_SNIPPET = `logits = model(tokens)        # one raw score per vocab word (e.g. 50,257)
probs  = softmax(logits)       # exponentiate + normalize → sums to exactly 1
# softmax([3.4, 2.7, 1.5]) ≈ [0.55, 0.28, 0.06] — bigger logit, bigger share`

const NEXT_TOKEN_SNIPPET = `tokens = tokenize("The cat sat")   # ["The", " cat", " sat"]
logits = model(tokens)              # score EVERY word in the vocabulary
probs  = softmax(logits)            # → a probability distribution
next_token = sample(probs)          # draw ONE token from it
tokens.append(next_token)           # ...and repeat, forever`

/**
 * Module 1.1 — What is an LLM?
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline, sources).
 */
export default function WhatIsAnLLM() {
  return (
    <>
      {/* Step 1 — Tokens: how models read text */}
      <Prose>
        <H2>Step 1 — Tokens: how models read text</H2>
        <p>
          A large language model never sees letters or words. Before anything else, your text is
          chopped into <strong>tokens</strong> — subword chunks drawn from a fixed vocabulary of
          maybe 50,000–200,000 entries. Common words survive intact; rare words get split into
          pieces (<span className="font-mono">unbelievable</span> might become{' '}
          <span className="font-mono">un + believ + able</span>). Each token is then just an integer
          ID: <span className="font-mono">"cat"</span> might be token 2368.
        </p>
        <p>
          Why subwords? Because a fixed vocabulary can't list every word in every language, but a
          small set of reusable pieces can spell anything — and the model learns what pieces mean
          from how they combine. Try it yourself:
        </p>
      </Prose>
      <TokenizerPlayground />
      <Prose>
        <p>
          Everything downstream — attention, sampling, the whole transformer — operates on these ID
          sequences, never on raw text. We'll build the full tokenizer story in{' '}
          <ModuleLink id="tokenization-embeddings" />.
        </p>

        <H2>Step 2 — Next-token prediction: one guess at a time</H2>
        <p>
          Strip away the mystique and an LLM does exactly one thing: given a sequence of tokens,
          it assigns a score to <em>every token in the vocabulary</em> as a candidate for what comes
          next. That's it. "Write me an essay" is the same loop as "finish the word" — the model
          predicts one token, appends it, predicts the next, appends that, thousands of times.
        </p>
        <Callout kind="tip" title="Autoregression in one sentence">
          The output is fed back into the input. Each token the model emits becomes part of the
          context for the next prediction — that feedback loop is why generation is sequential.
        </Callout>
        <CodeBlock language="python" filename="generate.py" code={NEXT_TOKEN_SNIPPET} />
        <p>
          The widget below shows the final step of that loop on real, baked logits: a handful of
          candidate tokens and the probabilities the model assigns them. Sample a few times and
          watch how often the top pick wins — that's the model "deciding".
        </p>
      </Prose>
      <NextTokenSampler
        title="Your first next-token distribution"
        subtitle="Temperature is fixed at 1 here — we'll turn the knobs in the next module."
        showTemperature={false}
        showTopK={false}
        showTopP={false}
      />

      {/* Step 3 — Probability is the whole game */}
      <Prose>
        <H2>Step 3 — Probability is the whole game</H2>
        <p>
          The raw scores the model produces are called <strong>logits</strong> — one per vocabulary
          entry, any range, no meaning on their own. The <strong>softmax</strong> function converts
          them into a proper probability distribution: positive numbers that sum to exactly 1.
        </p>
        <CodeBlock language="python" filename="softmax.py" code={SOFTMAX_SNIPPET} />
        <p>
          This framing — "a probability distribution over the next token" — explains almost every
          LLM behavior you've heard about. Greedy decoding picks the top token every time (safe,
          repetitive). Sampling picks randomly according to the distribution (creative, occasionally
          unhinged). The knobs you may have used in ChatGPT-adjacent tools — temperature, top-p —
          are all just ways of reshaping this distribution before the die is cast. The{' '}
          <a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noopener noreferrer">GPT-3 paper</a>{' '}
          showed that this one simple objective, scaled up, produces in-context learning: few-shot
          abilities nobody explicitly trained for.
        </p>
        <H3>But where did the logits come from?</H3>
        <p>
          From training: the model's billions of parameters were adjusted so that, across trillions
          of words of internet text, the true next token kept getting higher probability. That
          process — pretraining — is the subject of <ModuleLink id="how-llms-work" /> and the
          Training track.
        </p>

        {/* Step 4 — Why scale changes everything */}
        <H2>Step 4 — Why scale changes everything</H2>
        <p>
          The 2017–2018 era models did the same thing this widget does, just worse. What changed
          wasn't the objective — it was scale. More parameters, more data, more compute produced
          not just "somewhat better text" but qualitatively new abilities: arithmetic, translation,
          code, multi-step reasoning — abilities that were never in the loss function. Researchers
          call these <strong>emergent capabilities</strong>, and the{' '}
          <a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noopener noreferrer">few-shot learning results in GPT-3</a>{' '}
          were the first large-scale evidence.
        </p>
        <p>
          For a from-scratch learner, the takeaway is genuinely encouraging: there is no hidden
          magic layer. An LLM is a very large function that maps token sequences to next-token
          probabilities, trained to be uncannily good at it. Everything else — chat, agents, tools
          — is engineering wrapped around this loop. The{' '}
          <a href="https://www.youtube.com/watch?v=zjkBMFhNj_g" target="_blank" rel="noopener noreferrer">Karpathy big-picture talk</a>{' '}
          and the <a href="https://huggingface.co/learn/llm-course/chapter1/1" target="_blank" rel="noopener noreferrer">Hugging Face LLM Course</a>{' '}
          are excellent companions if you want external reinforcement.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'LLMs read tokens — subword IDs from a fixed vocabulary — never raw characters or words.',
          'The only native task is next-token prediction: score every vocab entry, softmax into probabilities, sample one.',
          'Generation is a loop: each sampled token is appended and fed back in (autoregression).',
          'Temperature, top-k, and top-p reshape the probability distribution before sampling — they do not change the model.',
          'Scale (parameters, data, compute) is what turned next-token prediction into general capability.',
        ]}
      />
    </>
  )
}