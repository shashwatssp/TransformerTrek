/**
 * Knowledge-check quiz shown at the end of every module.
 * Self-contained and local: tapping an option locks the question,
 * reveals right/wrong with a one-line explanation, and a final
 * score with a retry. Nothing is submitted anywhere.
 */
import { useState } from 'react'
import { getQuiz } from '../lib/quizzes'

export function Quiz({ moduleId, title }: { moduleId: string; title: string }) {
  const questions = getQuiz(moduleId)
  // answers: question index -> chosen option index
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [attempt, setAttempt] = useState(0)

  if (!questions) return null

  const answeredCount = Object.keys(answers).length
  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0),
    0,
  )
  const allAnswered = answeredCount === questions.length

  const choose = (qi: number, oi: number) => {
    if (qi in answers) return
    setAnswers((prev) => ({ ...prev, [qi]: oi }))
  }

  const retry = () => {
    setAnswers({})
    setAttempt((a) => a + 1)
  }

  return (
    <section
      key={attempt}
      className="mt-12 rounded-xl border border-accent/25 bg-accent/5 p-5"
      aria-label={`Knowledge check for ${title}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Knowledge check
        </h2>
        <span className="font-mono text-xs text-ink-muted" aria-live="polite">
          {answeredCount}/{questions.length} answered
          {allAnswered && (
            <span className={score === questions.length ? 'text-success' : 'text-ink'}>
              {' '}· score {score}/{questions.length}
            </span>
          )}
        </span>
      </div>

      <ol className="mt-4 space-y-6">
        {questions.map((q, qi) => {
          const chosen = answers[qi]
          const isAnswered = chosen !== undefined
          const isCorrect = chosen === q.answer
          return (
            <li key={qi}>
              <p className="text-sm font-medium text-ink">
                <span className="mr-1.5 font-mono text-xs text-ink-muted">{qi + 1}.</span>
                {q.q}
              </p>
              <div
                role="group"
                aria-label={`Question ${qi + 1} options`}
                className="mt-2 flex flex-col gap-1.5"
              >
                {q.options.map((opt, oi) => {
                  const correct = oi === q.answer
                  const pickedThis = chosen === oi
                  // Base style; locked questions color the right answer and the mistake.
                  let cls = 'border-border bg-surface text-ink/90 hover:border-accent/50 hover:bg-surface-raised'
                  if (isAnswered && correct) {
                    cls = 'border-success/50 bg-success/10 text-success'
                  } else if (isAnswered && pickedThis && !correct) {
                    cls = 'border-danger/50 bg-danger/10 text-danger'
                  } else if (isAnswered) {
                    cls = 'border-border bg-surface text-ink-muted'
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => choose(qi, oi)}
                      disabled={isAnswered}
                      aria-pressed={pickedThis}
                      className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition active:scale-[0.99] disabled:cursor-default ${cls}`}
                    >
                      <span
                        aria-hidden
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current font-mono text-[10px]"
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="min-w-0 flex-1">{opt}</span>
                      {isAnswered && correct && <span aria-hidden>✓</span>}
                      {isAnswered && pickedThis && !correct && <span aria-hidden>✗</span>}
                    </button>
                  )
                })}
              </div>
              {isAnswered && (
                <p
                  className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-5 ${
                    isCorrect
                      ? 'border-success/30 bg-success/5 text-ink/80'
                      : 'border-highlight/30 bg-highlight/5 text-ink/80'
                  }`}
                >
                  <span className={`mr-1 font-semibold ${isCorrect ? 'text-success' : 'text-highlight'}`}>
                    {isCorrect ? 'Correct.' : `Not quite — the answer is ${String.fromCharCode(65 + q.answer)}.`}
                  </span>
                  {q.why}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {allAnswered && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-sm text-ink/85" aria-live="polite">
            {score === questions.length
              ? `Perfect — ${score}/${questions.length} on ${title}.`
              : `You scored ${score}/${questions.length}. Skim the explanations above, then try again.`}
          </p>
          <button
            onClick={retry}
            className="ml-auto min-h-9 rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-accent active:scale-[0.97]"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  )
}
