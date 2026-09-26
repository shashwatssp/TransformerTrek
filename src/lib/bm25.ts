/** Okapi BM25 — production-faithful scoring for the BM25Lab widget. */

export type BM25Doc = {
  id: string
  title: string
  text: string
}

export type BM25Result = {
  doc: BM25Doc
  score: number
  /** per-query-term contributions: [term, idf, tfComponent, termScore] */
  breakdown: { term: string; idf: number; tfNorm: number; contribution: number; freq: number }[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export type BM25Index = {
  docs: BM25Doc[]
  docTokens: string[][]
  docFreq: Map<string, number>
  docLengths: number[]
  avgdl: number
  N: number
}

export function buildIndex(docs: BM25Doc[]): BM25Index {
  const docTokens = docs.map((d) => tokenize(`${d.title} ${d.text}`))
  const docFreq = new Map<string, number>()
  for (const tokens of docTokens) {
    for (const t of new Set(tokens)) docFreq.set(t, (docFreq.get(t) ?? 0) + 1)
  }
  const docLengths = docTokens.map((t) => t.length)
  const avgdl = docLengths.reduce((a, b) => a + b, 0) / Math.max(docs.length, 1)
  return { docs, docTokens, docFreq, docLengths, avgdl, N: docs.length }
}

/** Lucene-style IDF: always positive */
export function idf(N: number, df: number): number {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5))
}

/**
 * BM25 term-frequency component with saturation and length normalization.
 *   tfPart = f*(k1+1) / (f + k1*(1-b + b*|d|/avgdl))
 */
export function tfPart(f: number, k1: number, b: number, docLen: number, avgdl: number): number {
  const K = k1 * (1 - b + (b * docLen) / avgdl)
  return (f * (k1 + 1)) / (f + K)
}

export function scoreAll(
  index: BM25Index,
  query: string,
  k1: number,
  b: number,
): BM25Result[] {
  const qTerms = [...new Set(tokenize(query))]
  return index.docs.map((doc, di) => {
    const tokens = index.docTokens[di]
    const docLen = index.docLengths[di]
    let score = 0
    const breakdown: BM25Result['breakdown'] = []
    for (const term of qTerms) {
      const df = index.docFreq.get(term) ?? 0
      const idfV = idf(index.N, df)
      const f = tokens.filter((t) => t === term).length
      const tfNorm = tfPart(f, k1, b, docLen, index.avgdl)
      const contribution = idfV * tfNorm
      score += contribution
      breakdown.push({ term, idf: idfV, tfNorm, contribution, freq: f })
    }
    return { doc, score, breakdown }
  }).sort((a, b2) => b2.score - a.score)
}

/** Term-frequency saturation curve values for charting: y = f(k1+1)/(f + k1*K) */
export function saturationCurve(k1: number, b: number, docLenRatio: number, maxF = 12): { f: number; y: number }[] {
  const K = k1 * (1 - b + b * docLenRatio)
  const out: { f: number; y: number }[] = []
  for (let f = 0; f <= maxF; f += 0.25) {
    out.push({ f, y: (f * (k1 + 1)) / (f + K) })
  }
  return out
}
