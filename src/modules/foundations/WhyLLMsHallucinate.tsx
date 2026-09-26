/**
 * Module 1.3: Why LLMs Hallucinate
 * Body content follows the registry steps for id 'why-llms-hallucinate'.
 */
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'

const ABSTAIN_SNIPPET = `// Abstention gate: refuse to answer from weak retrieval (TypeScript)
const MIN_SCORE = 0.35 // calibrate on your own evals

async function answer(question: string) {
  const hits = await retrieve(question, { topK: 5 })
  const best = hits[0]?.score ?? 0

  if (best < MIN_SCORE) {
    // Better to admit ignorance than to confabulate from thin context
    return {
      answer: "I couldn't find this in the documentation.",
      cited: [],
      abstained: true,
    }
  }
  return generateGrounded(question, hits) // prompt forbids outside knowledge
}`

/**
 * Module 1.3: Why LLMs Hallucinate?
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline, sources).
 */
export default function WhyLLMsHallucinate() {
  return (
    <>
      <Prose>
        <p>
          Everything before this module explained how models <em>succeed</em>. This one explains
          the failure you'll be asked about most: the model produces something fluent, specific,
          and wrong, with total confidence. That behavior has a name, <strong>hallucination</strong>,
          and a cause. It is not a bug someone forgot to patch; it is what the training objective
          produces when the model doesn't know. Understanding that is what lets you design systems
          that fail safely instead.
        </p>
      </Prose>

      {/* Step 1 */}
      <H2>Step 1: Plausibility is the objective, not truth</H2>
      <Prose>
        <p>
          Recall the only native skill from <ModuleLink id="what-is-an-llm" />: given tokens, score
          every vocabulary entry as a candidate for what comes next. Nothing in that objective asks
          "is this true?", it asks "what would text like this continue with?" A fabricated citation
          with a plausible author name, a plausible journal, and a plausible year is, in statistical
          terms, <em>excellent</em> next-token prediction. The model is not lying; lying requires
          knowing the truth and choosing against it. It is doing exactly what it was trained to do
          in a region where the training signal was thin.
        </p>
        <p>
          Researchers split the phenomenon into <strong>intrinsic</strong> hallucinations (the
          output contradicts the source you provided) and <strong>extrinsic</strong> ones (the
          output adds claims you can't verify from any source). The{' '}
          <a href="https://arxiv.org/abs/2202.03629" target="_blank" rel="noopener noreferrer">survey by Ji et al.</a>{' '}
          formalizes the distinction; the practical takeaway is that they have different fixes, and
          "more parameters" fixes neither.
        </p>
      </Prose>

      {/* Step 2 */}
      <H2>Step 2: Why evals accidentally reward guessing</H2>
      <Prose>
        <p>
          There's a second culprit, and it's us. Benchmarks grade most tasks{' '}
          <strong>binary</strong>: right or wrong. If a model says "I don't know," it scores zero,
          if it guesses, it scores full marks some fraction of the time. Under that grading rule,
          the <em>rational</em> strategy is to always answer confidently, even at the edge of
          knowledge. The{' '}
          <a href="https://arxiv.org/abs/2509.04964" target="_blank" rel="noopener noreferrer">OpenAI analysis (2025)</a>{' '}
          makes this case sharply: models hallucinate in part because we reward the confidence and
          penalize the honesty. It follows that the fix is partly on the eval side, grade
          abstention as correct when the answer isn't known, and models learn to say so.
        </p>
        <Callout kind="warn" title="The interview trap">
          "Why not just lower the temperature?" Temperature changes how randomly you{' '}
          <em>sample</em>, not whether the top choice is true, the topics came from{' '}
          <ModuleLink id="how-llms-work" />. A temperature-0 model repeats the same wrong answer
          with perfect confidence. Randomness and accuracy are different axes; confusing them is
          the most common hallucination question trap.
        </Callout>
      </Prose>

      {/* Step 3 */}
      <H2>Step 3: The mitigation ladder: grounding, citations, abstention</H2>
      <Prose>
        <p>
          You cannot make a model that never confabulates. You can build systems that confabulate
          <em> harmlessly</em>. In order of reliability:
        </p>
        <ol className="my-4 list-decimal space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Ground it.</strong> Retrieve the facts at inference time (<ModuleLink id="rag" />) and instruct the model to answer only from them. Knowledge moves from frozen weights to an index you control.</li>
          <li><strong>Cite it.</strong> Require a source per claim; answers without one get flagged. Citations also make failures <em>debuggable</em>, you can see which retrieval fed the bad claim.</li>
          <li><strong>Let it abstain.</strong> When retrieval is weak or the model signals low confidence, "I couldn't find this" is the correct output. Gate it in code:</li>
        </ol>
      </Prose>
      <CodeBlock language="typescript" filename="abstain.ts" code={ABSTAIN_SNIPPET} />
      <Prose>
        <p>
          Above that: verify with a second pass (a faithfulness check that every claim is entailed
          by the retrieved context, the RAGAS-style metrics of <ModuleLink id="retrieval-evals" />),
          and keep a human on genuinely high-stakes outputs. Anthropic's{' '}
          <a href="https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations" target="_blank" rel="noopener noreferrer">guidance</a>{' '}
          follows the same shape: allow saying "I don't know", ground with retrieval, and measure.
        </p>
      </Prose>

      {/* Step 4 */}
      <H2>Step 4: Measuring truthfulness like an engineer</H2>
      <Prose>
        <p>
          "It hallucinates less" is not a number. Assemble a small private set of questions where
          you know the truth, including <strong>unanswerable ones</strong>, the only honest way to
          test abstention. Score two things separately: <em>accuracy</em> on answerable questions
          and <em>abstention rate</em> on unanswerable ones. A model that answers everything
          confidently scores well on the first and zero on the second. Run both on every prompt,
          retrieval, or model change, the habit from <ModuleLink id="evals" /> applies to
          truthfulness more than anywhere else.
        </p>

        <KeyTakeaways
          points={[
            'The training objective is plausibility, not truth, fluent fabrication is good next-token prediction, not a patched-out bug.',
            'Binary-graded evals reward guessing over abstaining, so models learn confident answers; grade "I don\'t know" as correct when it is.',
            'Temperature changes randomness, not accuracy, lowering it makes a wrong answer repeated, not right.',
            'The mitigation ladder: ground with RAG, force citations, gate abstention in code, verify faithfulness, human review for high stakes.',
            'Measure accuracy on answerable questions and abstention on unanswerable ones, a private eval set, run on every change.',
          ]}
        />
      </Prose>
    </>
  )
}
