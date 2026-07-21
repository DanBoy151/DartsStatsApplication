// Which totals are actually achievable on a standard dartboard, used to
// reject impossible entries (e.g. 179 - one of the 9 scores that can't be
// hit with 3 darts) and to enforce the "must finish on a double" checkout
// rule. Computed once from first principles (every real single-dart value)
// rather than hand-copied from a checkout chart, so it's provably correct
// for every input rather than only the cases someone thought to list.

export const MAX_SCORE = 180

// Every score a single dart can register: singles 1-20, doubles 2-40 (even)
// plus double bull (50), trebles 3-60 (multiples of 3), plus single bull (25).
// A miss (0) isn't included - "No Score" is a distinct action, not a value
// typed into the keypad, so 0 never needs to be validated as a dart segment.
function singleDartScores(): number[] {
  const values = Array.from({ length: 20 }, (_, i) => i + 1) // 1-20
  const doubles = [...values.map((v) => v * 2), 50]
  const trebles = values.map((v) => v * 3)
  return Array.from(new Set([...values, 25, ...doubles, ...trebles]))
}

function sumsOfUpToNDarts(dartScores: number[], n: number, max: number): Set<number>[] {
  // achievable[k] = totals reachable with EXACTLY k darts (k = 0..n).
  const achievable: Set<number>[] = [new Set([0])]
  for (let k = 1; k <= n; k++) {
    const prior = achievable[k - 1]!
    const next = new Set<number>()
    for (const sum of prior) {
      for (const dart of dartScores) {
        const total = sum + dart
        if (total <= max) next.add(total)
      }
    }
    achievable.push(next)
  }
  return achievable
}

const DART_SCORES = singleDartScores()
const DOUBLE_SCORES = [...Array.from({ length: 20 }, (_, i) => (i + 1) * 2), 50]

// achievableByCount[k] = every total reachable with EXACTLY k darts (k up to 3).
const achievableByCount = sumsOfUpToNDarts(DART_SCORES, 3, MAX_SCORE)

const ACHIEVABLE_UP_TO_3 = new Set<number>()
for (const set of achievableByCount) {
  for (const total of set) ACHIEVABLE_UP_TO_3.add(total)
}

// A valid checkout = some double, thrown last, preceded by 0-2 darts (any
// segment) that account for the rest of the score.
const ACHIEVABLE_UP_TO_2 = new Set<number>([...achievableByCount[0]!, ...achievableByCount[1]!, ...achievableByCount[2]!])
const CHECKOUT_SCORES = new Set<number>()
for (const double of DOUBLE_SCORES) {
  for (const lead of ACHIEVABLE_UP_TO_2) {
    const total = double + lead
    if (total <= MAX_SCORE) CHECKOUT_SCORES.add(total)
  }
}

/** Is this a total that up to 3 real darts could actually produce? (e.g. 179 never can.) */
export function isValidDartScore(score: number): boolean {
  return Number.isInteger(score) && ACHIEVABLE_UP_TO_3.has(score)
}

/** Is this a total that up to 3 darts could produce ending on a double (the standard "must finish on a double" rule)? */
export function isValidCheckoutScore(score: number): boolean {
  return Number.isInteger(score) && CHECKOUT_SCORES.has(score)
}
