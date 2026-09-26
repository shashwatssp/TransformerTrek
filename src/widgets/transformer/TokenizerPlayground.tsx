import { useState } from 'react'
import { Tabs, WidgetFrame } from '../../components/ui'
import { DEMO_VOCAB, tokenize } from '../../lib/tokenizer'
import type { TokenizedToken } from '../../lib/tokenizer'

const VOCAB_SET = new Set(DEMO_VOCAB)

/** Greedy longest-match segmentation of a single word (same rule as the lib tokenizer). */
function greedySplit(word: string): TokenizedToken[] {
  const tokens: TokenizedToken[] = []
  let pos = 0
  while (pos < word.length) {
    let match: string | null = null
    for (let len = Math.min(word.length - pos, 24); len >= 1; len--) {
      const cand = word.slice(pos, pos + len)
      if (VOCAB_SET.has(cand)) {
        match = cand
        break
      }
    }
    if (match) {
      const id = DEMO_VOCAB.indexOf(match)
      tokens.push({ token: match, id: id >= 0 ? id : 1, start: pos, end: pos + match.length })
      pos += match.length
    } else {
      tokens.push({ token: word[pos], id: 1, start: pos, end: pos + 1 })
      pos += 1
    }
  }
  return tokens
}

const UNK_ID = 1

function TokenChip({ t }: { t: TokenizedToken }) {
  const isUnk = t.id === UNK_ID && !DEMO_VOCAB[t.id]?.startsWith('<')
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded border px-1.5 py-0.5 font-mono text-xs ${
        isUnk ? 'border-danger/60 bg-danger/10 text-danger' : 'border-accent/40 bg-accent/10 text-ink'
      }`}
      title={`token "${t.token}" → vocab id ${t.id}${isUnk ? ' (<unk>)' : ''}`}
    >
      {t.token}
      <span className="text-[9px] text-ink-muted">{t.id}</span>
    </span>
  )
}

/**
 * Live demo tokenizer over a fixed toy vocabulary: sentence mode tokenizes
 * free text; word mode walks through greedy longest-match segmentation.
 */
export function TokenizerPlayground() {
  const [mode, setMode] = useState('Sentence')
  const [text, setText] = useState('Attention makes transformers understand unperturbed language.')
  const [word, setWord] = useState('tokenizing')

  const result = tokenize(text)
  const charCount = text.length
  const ratio = result.tokens.length > 0 ? charCount / result.tokens.length : 0

  const wordTokens = greedySplit(word.toLowerCase())

  return (
    <WidgetFrame
      title="Tokenizer playground"
      subtitle="Greedy longest-match over a toy vocab — a faithful teaching proxy for BPE. Runs entirely in your browser."
    >
      <Tabs
        tabs={['Sentence', 'Word splitter']}
        active={mode}
        onChange={setMode}
      />

      {mode === 'Sentence' ? (
        <div className="mt-4">
          <label className="block text-xs text-ink-muted" htmlFor="tok-input">
            Text to tokenize
          </label>
          <textarea
            id="tok-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-accent/60 focus:outline-none"
            aria-label="Text to tokenize"
          />
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tokens with vocabulary IDs">
            {result.tokens.map((t, i) => (
              <TokenChip key={`${t.start}-${i}`} t={t} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
              <dt className="text-ink-muted">characters</dt>
              <dd className="font-mono text-sm text-ink">{charCount}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
              <dt className="text-ink-muted">tokens</dt>
              <dd className="font-mono text-sm text-ink">{result.tokens.length}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
              <dt className="text-ink-muted">chars / token</dt>
              <dd className="font-mono text-sm text-ink">{ratio.toFixed(2)}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
              <dt className="text-ink-muted">vocab size</dt>
              <dd className="font-mono text-sm text-ink">{result.vocabSize}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-5 text-ink-muted" aria-live="polite">
            {result.unknownCount > 0
              ? `${result.unknownCount} token${result.unknownCount > 1 ? 's' : ''} had no vocab entry (red, id 1 = <unk>). Real tokenizers never need <unk> — they fall back to subwords and bytes.`
              : 'Every token found a vocab entry. Try adding an unusual word to see it split or fall back to <unk>.'}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <label className="block text-xs text-ink-muted" htmlFor="tok-word">
            One word to split
          </label>
          <input
            id="tok-word"
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-accent/60 focus:outline-none"
            aria-label="Word to split into subwords"
          />
          <ol className="mt-3 space-y-1.5" aria-label="Greedy longest-match steps">
            {wordTokens.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ink/85">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-[9px] text-accent">
                  {i + 1}
                </span>
                <span>
                  position {t.start}: looked for the longest vocab match starting here →{' '}
                  <span className={`font-mono ${t.id === UNK_ID ? 'text-danger' : 'text-accent'}`}>
                    "{t.token}"
                  </span>{' '}
                  <span className="text-ink-muted">(id {t.id})</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {wordTokens.map((t, i) => (
              <TokenChip key={i} t={t} />
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-ink-muted">
            BPE learns these vocab pieces from a corpus (most frequent pairs first), instead of
            hardcoding them. The greedy walk shows the same idea: prefer the longest piece you know,
            fall back to smaller pieces — in real BPE, down to single bytes.
          </p>
        </div>
      )}
    </WidgetFrame>
  )
}
