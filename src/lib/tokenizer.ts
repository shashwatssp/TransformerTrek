/**
 * Tiny demo tokenizer — NOT a real BPE implementation, but demonstrates the
 * concept faithfully: a fixed vocab of common words/subwords + greedy
 * longest-match splitting, with an <unk> fallback and character fallback.
 * Educational purposes: shows why "uncommon" words split into pieces.
 */

const VOCAB: string[] = [
  // special tokens
  '<pad>', '<unk>', '<s>', '</s>',
  // super common words
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'at', 'it',
  'and', 'or', 'but', 'if', 'for', 'with', 'as', 'by', 'from', 'that', 'this', 'these',
  'i', 'you', 'he', 'she', 'we', 'they', 'not', 'no', 'yes', 'can', 'will', 'would',
  // AI / transformer vocabulary
  'transform', 'transformer', 'transformers', 'attention', 'model', 'models', 'language',
  'learning', 'machine', 'neural', 'network', 'networks', 'token', 'tokens', 'tokenize',
  'embedding', 'embeddings', 'vector', 'vectors', 'matrix', 'matrices', 'query', 'key',
  'value', 'softmax', 'gradient', 'loss', 'train', 'training', 'trained', 'fine', 'tune',
  'tuning', 'fine-tune', 'fine-tuning', 'agent', 'agents', 'tool', 'tools', 'retrieval',
  'search', 'semantic', 'vectorize', 'generate', 'generates', 'generated', 'generation',
  'predict', 'predicts', 'prediction', 'predictions', 'probability', 'probabilities',
  'data', 'text', 'word', 'words', 'sentence', 'sentences', 'document', 'documents',
  'understand', 'understands', 'understanding', 'process', 'processes', 'processing',
  'deep', 'layer', 'layers', 'head', 'heads', 'multi-head', 'self', 'context', 'window',
  'human', 'humans', 'intelligence', 'artificial', 'artificial-intelligence',
  // common subwords
  'ing', 'ed', 'er', 'ers', 'tion', 'sion', 'ly', 'ness', 'ment', 'able', 'ize', 'ise',
  'pre', 'post', 'un', 're', 'de', 'dis', 'over', 'under', 'multi', 'auto', 'super',
  'ize', 'ation', 'ations', 'ology', 'ological', 'graph', 'graphs',
  // punctuation
  '.', ',', '!', '?', ':', ';', "'", '"', '(', ')', '-', '—',
]

const VOCAB_SET = new Set(VOCAB)
const VOCAB_IDS = new Map(VOCAB.map((t, i) => [t, i]))

export type TokenizedToken = {
  token: string
  id: number
  start: number
  end: number
}

export type TokenizeResult = {
  tokens: TokenizedToken[]
  vocabSize: number
  unknownCount: number
}

/** Split text into rough word/char chunks respecting whitespace boundaries */
function roughSplit(text: string): { chunk: string; start: number }[] {
  const out: { chunk: string; start: number }[] = []
  const re = /(\s+)|([A-Za-z0-9']+)|(.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m[1]) continue // skip whitespace but record position continuity
    out.push({ chunk: m[0], start: m.index })
  }
  return out
}

/** Greedy longest-match subword tokenization of one word */
function splitWord(word: string, start: number): TokenizedToken[] {
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
      tokens.push({ token: match, id: VOCAB_IDS.get(match) ?? 1, start: start + pos, end: start + pos + match.length })
      pos += match.length
    } else {
      // fall back to single character mapped to <unk>-style id
      tokens.push({ token: word[pos], id: 1, start: start + pos, end: start + pos + 1 })
      pos += 1
    }
  }
  return tokens
}

export function tokenize(text: string): TokenizeResult {
  const tokens: TokenizedToken[] = []
  let unknownCount = 0
  for (const { chunk, start } of roughSplit(text)) {
    const lower = chunk.toLowerCase()
    if (VOCAB_SET.has(lower)) {
      const id = VOCAB_IDS.get(lower) ?? 1
      const isSpecial = lower.startsWith('<')
      tokens.push({ token: chunk, id: isSpecial ? id : id, start, end: start + chunk.length })
      if (id === 1 && !isSpecial) unknownCount++
    } else if (/^[A-Za-z0-9']+$/.test(chunk)) {
      const pieces = splitWord(lower, start)
      tokens.push(...pieces)
    } else {
      // punctuation / symbols — check vocab (single chars), else unk
      if (VOCAB_SET.has(chunk)) {
        tokens.push({ token: chunk, id: VOCAB_IDS.get(chunk) ?? 1, start, end: start + chunk.length })
      } else {
        tokens.push({ token: chunk, id: 1, start, end: start + chunk.length })
        unknownCount++
      }
    }
  }
  return { tokens, vocabSize: VOCAB.length, unknownCount }
}

export { VOCAB as DEMO_VOCAB }
