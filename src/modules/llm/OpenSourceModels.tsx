/**
 * Module, Open-Source Models, Honestly Compared
 * Body content only; sections follow the registry `steps` order exactly.
 * Covers the major open-weight families, their training recipes, licenses,
 * a selection framework, and how to run them locally.
 */
import {
  Callout,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  SourceList,
  StepList,
} from '../../components/ui'

export default function OpenSourceModels() {
  return (
    <>
      {/* Step 1 ─ Why open weights matter */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1: What "open" means, and why it matters</H2>
        <Prose>
          <p>
            "Open-source" in LLMs really means <strong>open weights</strong>: the trained parameters are
            downloadable, usually with a license that may or may not be OSI-approved. Training code,
            data, and logs are rarely public. Even so, open weights buy you three things a closed API
            cannot:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Control.</strong> The model runs on your hardware. No rate limits, no silent
              deprecations, no data leaving your perimeter.
            </li>
            <li>
              <strong>Customization.</strong> You can fine-tune, distill, and quantize (see{' '}
              <ModuleLink id="fine-tuning" />), which is often the cheapest path to a specialized model.
            </li>
            <li>
              <strong>Cost shape.</strong> Pay for GPUs per token of usage instead of margin per token
              of usage; at scale the math can flip in your favor.
            </li>
          </ul>
          <Callout kind="warn" title="License fine print is part of the model">
            Apache-2.0 and MIT are genuinely permissive. Llama and Gemma ship custom licenses with
            acceptable-use conditions and (for some Llama versions) a 700M-monthly-active-user cap.
            Read the license before committing a product to a weights family.
          </Callout>
        </Prose>
      </section>

      {/* Step 2 ─ The families at a glance */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2: The big open-weight families</H2>
        <Prose>
          <p>
            Six families cover most of the ecosystem. Sizes and versions move fast; what stays stable is
            each family's <em>signature strength</em>:
          </p>
          <ComparisonTable
            columns={[
              { id: 'family', label: 'Family' },
              { id: 'shape', label: 'Typical shape' },
              { id: 'license', label: 'License' },
              { id: 'strength', label: 'Signature strength' },
            ]}
            rows={[
              { label: 'Llama (Meta)', values: { family: 'Llama 3 / 3.1 / 4', shape: 'Dense 8B, 70B, 405B; Llama 4 adds MoE', license: 'Custom Llama license', strength: 'The default generalist; huge tooling ecosystem' } },
              { label: 'Mistral', values: { family: 'Mistral 7B, Mixtral MoE, Mistral Large', shape: 'Small dense + sparse MoE', license: 'Apache-2.0 for most releases', strength: 'Efficiency and permissiveness; strong small models' } },
              { label: 'Qwen (Alibaba)', values: { family: 'Qwen2.5 / Qwen3', shape: '0.5B to 235B+, dense and MoE, coder variants', license: 'Apache-2.0 for most sizes', strength: 'Multilingual, coding, and long-context leaders' } },
              { label: 'Gemma (Google)', values: { family: 'Gemma 1 / 2 / 3', shape: '1B to 27B dense', license: 'Gemma terms of use', strength: 'Distilled from Gemini; excellent quality-per-parameter' } },
              { label: 'DeepSeek', values: { family: 'V3, R1', shape: '671B MoE, ~37B active', license: 'MIT', strength: 'Frontier-adjacent reasoning at open prices' } },
              { label: 'Phi (Microsoft)', values: { family: 'Phi-3 / Phi-4', shape: '3.8B to 14B dense', license: 'MIT (Phi-4)', strength: 'Small models trained on curated synthetic "textbook" data' } },
            ]}
          />
          <Callout kind="info" title="The two architectures, recapped">
            Dense models activate every parameter for every token; Mixture-of-Experts models route each
            token to a few experts. Module <ModuleLink id="how-llms-are-trained" /> walks the trade-off
            with a live router you can play with.
          </Callout>
        </Prose>
      </section>

      {/* Step 3 ─ How they are trained */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3: How they are trained, four recipes</H2>
        <Prose>
          <p>
            All of these models share the pipeline you already know (pretraining, then post-training:
            <ModuleLink id="pretraining" /> and <ModuleLink id="fine-tuning" />). The families differ in
            where they spend the compute:
          </p>
          <StepList
            steps={[
              'Brute scale with relentless engineering (Llama 3): biggest dense runs, trillions of filtered tokens, precision and parallelism tricks. The 405B run is the reference for "dense at the limit".',
              'Sparsity first (DeepSeek-V3, Mixtral, Qwen MoE): route tokens to experts so total capacity dwarfs active compute; train cheap, infer cheap.',
              'Distill from a bigger teacher (Gemma, MiniLM-style): a small student learns from a frontier teacher logits and attention, punching far above its size.',
              'Data quality as the lever (Phi): train on curated, textbook-grade synthetic data so a 14B model reasons like far larger models on exams and code.',
            ]}
          />
          <p>
            Post-training differs less between families than marketing suggests: supervised fine-tuning
            on instruction data, then a preference or verifiable-reward stage (RLHF/DPO, or the RLVR
            recipe that produced DeepSeek-R1). "Instruct" on a model card means that pipeline ran; "base"
            means it did not, and a base model only completes text.
          </p>
          <Callout kind="tip" title="Reading a model card like a recipe">
            Four fields tell you most of the story: total vs active parameters, training token count,
            context length, and the post-training stages. Practice in{' '}
            <ModuleLink id="how-llms-are-trained" /> with Llama 3 and DeepSeek-V3, then read any new
            release in minutes.
          </Callout>
        </Prose>
      </section>

      {/* Step 4 ─ Which model to pick */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4: Which one should you pick?</H2>
        <Prose>
          <p>
            There is no global "best"; there is best-for-your-constraints. Decide in this order:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>License first.</strong> Commercial product with strict procurement? Prefer
              Apache-2.0/MIT families (Mistral, most Qwen, Phi-4, DeepSeek) over custom-license ones.
            </li>
            <li>
              <strong>Hardware second.</strong> Rough rule for a quantized model: 4-bit weights plus
              activations need about 0.6 GB per billion parameters. A laptop with 16 GB RAM is
              comfortable in the 3B to 8B range; one 24 GB GPU handles 14B to 32B comfortably; MoE
              giants are multi-GPU affairs.
            </li>
            <li>
              <strong>Task third.</strong> Coding: Qwen coder variants or DeepSeek. Multilingual:
              Qwen or Gemma. Cheap classification/extraction on-device: Gemma 3 1B to 4B or Phi.
              Deep reasoning with open weights: DeepSeek-R1 style reasoning models.
            </li>
          </ul>
          <Callout kind="info" title="Benchmark scores are a floor, not a verdict">
            Published scores come from the vendor's own runs or contaminated public sets (see{' '}
            <ModuleLink id="evals" />). Treat them as a filter to build a shortlist, then eval two
            candidates on your own twenty tasks before committing.
          </Callout>
        </Prose>
      </section>

      {/* Step 5 ─ Run them yourself */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5: Run one tonight</H2>
        <Prose>
          <p>
            The fastest path from curious to running (start small, then scale up):
          </p>
          <StepList
            steps={[
              'Ollama for the one-command experience: ollama run llama3.2 or ollama run qwen3, quantized and ready.',
              'llama.cpp for control: run GGUF-quantized weights on CPU or modest GPUs, tune context and threads yourself.',
              'vLLM for serving: an OpenAI-compatible endpoint with high throughput, the standard for self-hosted inference.',
              'Hugging Face transformers for everything else: the model cards in the sources below all open in a notebook.',
            ]}
          />
          <SourceList
            sources={[
              { title: 'Llama model collection on Hugging Face', url: 'https://huggingface.co/meta-llama', note: 'Model cards with the full Llama 3 recipe.' },
              { title: 'Mistral AI models and docs', url: 'https://docs.mistral.ai/', note: 'Apache-2.0 releases and serving guidance.' },
              { title: 'Qwen on GitHub', url: 'https://github.com/QwenLM/', note: 'Qwen2.5 and Qwen3 families, coder and multimodal variants.' },
              { title: 'Gemma docs (Google AI)', url: 'https://ai.google.dev/gemma', note: 'The distilled-from-Gemini open-weight line.' },
              { title: 'DeepSeek on GitHub', url: 'https://github.com/deepseek-ai', note: 'DeepSeek-V3 and R1 weights and technical reports.' },
              { title: 'Phi-4 model card', url: 'https://huggingface.co/microsoft/phi-4', note: 'The synthetic-textbook-data training story.' },
              { title: 'Ollama library', url: 'https://ollama.com/library', note: 'One-command quantized runs of every family above.' },
              { title: 'vLLM docs', url: 'https://docs.vllm.ai/', note: 'Production-grade self-hosted serving.' },
            ]}
          />
          <KeyTakeaways
            points={[
              'Open weights = control, customization, and a different cost curve; the license is part of the decision.',
              'Four recipes explain the families: dense scale, MoE sparsity, distillation, and data quality.',
              'Pick by license, then hardware, then task; verify shortlisted models on your own eval tasks.',
              'Base models complete text, instruct models follow instructions; reasoning models add verifiable-reward training.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
