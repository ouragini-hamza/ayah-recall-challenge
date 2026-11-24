/** Arabic text helpers for comparing a recognised transcript with Uthmani reference text. */

// Tashkeel, Quranic annotation marks, dagger alif, tatweel.
const STRIP = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/gu;

/**
 * Reduce a word to its consonant skeleton so a diacritised Uthmani word and an
 * undiacritised recogniser word can be compared. Letter-level differences remain.
 */
export function normalizeWord(word: string): string {
  return word
    .normalize("NFKC")
    .replace(STRIP, "")
    .replace(/[\u0671\u0622\u0623\u0625]/gu, "\u0627") // alef variants -> alef
    .replace(/\u0649/gu, "\u064A") // alef maqsura -> ya
    .replace(/\u0629/gu, "\u0647") // ta marbuta -> ha
    .replace(/\u0624/gu, "\u0648") // hamza on waw -> waw
    .replace(/\u0626/gu, "\u064A") // hamza on ya -> ya
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function normalizedTokens(text: string): string[] {
  return text
    .split(/\s+/u)
    .map(normalizeWord)
    .filter((token) => token.length > 0);
}

/** Levenshtein distance between two short strings. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j] ?? 0;
      prev[j] = Math.min(up + 1, (prev[j - 1] ?? 0) + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length] ?? 0;
}

/** 1 = identical, 0 = nothing in common. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}
