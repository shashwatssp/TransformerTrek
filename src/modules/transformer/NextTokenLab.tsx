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

const PIPELINE_SNIPPET = `def decode_step(logits, temperature=0.8, top_k=50, top_p=0.95, rng=random):
    probs = softmax([l / temperature for l in logits])   # 1. temperature
    keep  = set(top_k_indices(logits, top_k))            # 2. top-k: fixed cut
    keep &= set(top_p_indices(probs, top_p))             # 3. top-p: adaptive cut
    probs = renormalize(probs, keep)                     # 4. zero the rest, rescale
    return sample(probs, rng)                            # 5. draw ONE token

def generate(prompt, n):
    tokens = tokenize(prompt)
    for _ in range(n):
        logits = model(tokens)[-1]        # forward pass → next-token logits
        tokens.append(decode_step(logits))
    return detokenize(tokens)`

/**
 * Module 2.6 — Next-Token Prediction Lab
 */
export default function NextTokenLab() {
  return (
    <>
      {/* Step 1 — Logits → probabilities review */}
      <Prose>
        <H2>Step 1 — Logits → probabilities review</H2>
        <p>
          Everything in this module operates on the last two steps of{' '}
          <ModuleLink id="what-is-an-llm">Module 1.1</ModuleLink>'s pipeline. The model emits{' '}
          <strong>logits</strong> — one raw score per vocabulary entry, unbounded in range. The{' '}
          <strong>softmax</strong> with temperature T turns them into probabilities:
          exponentiate each score divided by T, then normalize so the row sums to exactly 1.
        </p>
        <Callout kind="math" title="Why exponentiate?">
          exp() is always positive (probabilities can't be negative) and it's monotonic (bigger
          logit → bigger probability). The division by the sum only <em>rescales</em> — the shape
          of the distribution comes from the relative gaps between logits. That's why a +1 nudge
          on one logit can reshuffle everything: softmax cares about ratios, not absolutes.
        </Callout>
        <p>
          <ModuleLink id="how-llms-work">Module 1.2</ModuleLink> introduced the two knobs —
          temperature and truncation — conceptually. This lab isolates each one so you can see
          exactly what it does to the same underlying distribution, then assembles the full
          decode step.
        </p>

        {/* Step 2 — Temperature in practice */}
        <H2>Step 2 — Temperature in practice</H2>
        <p>
          Temperature rescales logits <em>before</em> softmax: divide by T &lt; 1 and the gaps
          between logits grow (sharp); divide by T &gt; 1 and the gaps shrink (flat). Watch the
          "p after T" column below: sweep T from 0.1 to 2 and find the value where the
          distribution stops being near-certain and starts being adventurous.
        </p>
      </Prose>
      <NextTokenSampler
        title="Temperature lab"
        subtitle="One knob: watch the distribution sharpen and flatten as you drag."
        showTopK={false}
        showTopP={false}
      />
      <Prose>
        <Callout kind="warn" title="The T → 0 trap">
          As T → 0, sampling approaches greedy argmax — deterministic, but prone to repetition
          loops. Production settings rarely go below ~0.2; "temperature 0" in APIs usually means
          "greedy" implemented with special-casing, not literally T = 0 (which would divide by
          zero).
        </Callout>

        {/* Step 3 — Top-k: cut the tail */}
        <H2>Step 3 — Top-k: cut the tail</H2>
        <p>
          Truncation answers a different question than temperature. Temperature reshapes
          <em> all</em> candidates; truncation <em>deletes</em> the unlikely ones outright, then
          renormalizes what survives. Top-k keeps a fixed number of candidates — drag the k
          slider below and watch tokens get crossed out: a cut token's probability is
          redistributed proportionally, and it can never be sampled.
        </p>
        <p>
          The weakness of a fixed cut: k = 2 is luxurious when the model is confident (the top
          two tokens have 97% of the mass) and criminal when it's torn (the 3rd-best token might
          be perfectly fine). The widget makes this visible: watch which tokens get crossed out
          as you sweep k.
        </p>
      </Prose>
      <NextTokenSampler
        title="Top-k lab"
        subtitle="Temperature + top-k: fixed-size cut, renormalized."
        showTopP={false}
      />
      <Prose>
        {/* Step 4 — Top-p: the nucleus rule */}
        <H2>Step 4 — Top-p: the nucleus rule</H2>
        <p>
          Top-p (nucleus sampling, <a href="https://arxiv.org/abs/1904.09751" target="_blank" rel="noopener noreferrer">Holtzman et al., 2019</a>)
          replaces "keep k tokens" with "keep the smallest set whose probabilities sum to at
          least p". The cut now adapts to the model's confidence:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Confident distribution</strong> (one token at 90%): even p = 0.95 keeps ~2 tokens.</li>
          <li><strong>Torn distribution</strong> (five tokens near 15% each): p = 0.95 keeps all five.</li>
        </ul>
        <p>
          Switch between the two prompts above the widget and watch the cut set change size —
          that adaptivity, not any single magic number, is the idea. Try p = 0.05 (nearly
          greedy) versus p = 1 (no cut at all).
        </p>
      </Prose>
      <NextTokenSampler
        title="Full pipeline lab"
        subtitle="Temperature + top-k + top-p — the complete pre-sampling pipeline."
      />

      {/* Step 5 — Putting it together: the decode loop */}
      <Prose>
        <H2>Step 5 — Putting it together: the decode loop</H2>
        <p>
          The widget above is literally the function below — same order of operations, same
          renormalization. This is the complete decode step of most LLM APIs you've used
          (compare <a href="https://huggingface.co/docs/transformers/generation_strategies" target="_blank" rel="noopener noreferrer">Hugging Face's generation strategies page</a>):
        </p>
        <CodeBlock language="python" filename="decode.py" code={PIPELINE_SNIPPET} />
        <p>
          One full turn of an LLM = this decode step, repeated: forward pass → temperature →
          top-k → top-p → renormalize → sample → append. Nothing in the loop changes the model;
          it only decides how the model's distribution gets <em>read</em> — which is why the
          same model can be a precise assistant at low temperature and a creative collaborator
          at high temperature. Where those weights come from is the story of the Training
          track; how they're used by systems that act is the story of the Agents track.
        </p>
        <H3>Where to go next</H3>
        <p>
          You can now read any generation-settings panel fluently: temperature, top-p, top-k
          are the three dials you met here. The natural next stops are{' '}
          <ModuleLink id="attention" /> (the mechanism that produces the logits) and{' '}
          <ModuleLink id="architecture" /> (the stack that houses it).
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Softmax with temperature turns logits into probabilities; temperature only reshapes — it never re-ranks.',
          'Top-k keeps a fixed candidate count; top-p keeps an adaptive set whose mass ≥ p — usually the better default.',
          'Truncation deletes and renormalizes: cut tokens get zero probability and can never be sampled.',
          'The full pipeline — T → top-k → top-p → renormalize → sample → append — is the entire decode loop of most LLM APIs.',
          "Sampling knobs change how the model's distribution is read, not what the model believes.",
        ]}
      />
    </>
  )
}