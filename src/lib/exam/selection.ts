/** Random passage selection and prompt excerpts. Pure and RNG-injectable for tests. */
import type { Ayah } from "@/lib/quran/types";

export type Rng = () => number;

export interface StartSelectionOptions {
  rangeLength: number;
  ayahsPerRound: number;
  rounds: number;
  avoidRepeats: boolean;
  rng?: Rng;
}

/**
 * Returns `rounds` start indices into the range such that every passage of
 * `ayahsPerRound` consecutive ayahs fits entirely inside the range.
 * With `avoidRepeats`, starts are unique until every valid start has been used.
 */
export function selectStartIndices({
  rangeLength,
  ayahsPerRound,
  rounds,
  avoidRepeats,
  rng = Math.random,
}: StartSelectionOptions): number[] {
  const validCount = rangeLength - ayahsPerRound + 1;
  if (validCount < 1 || rounds < 1) return [];
  const pick = (n: number) => Math.min(n - 1, Math.floor(rng() * n));

  if (!avoidRepeats) {
    return Array.from({ length: rounds }, () => pick(validCount));
  }

  const result: number[] = [];
  let pool: number[] = [];
  while (result.length < rounds) {
    if (pool.length === 0) pool = Array.from({ length: validCount }, (_, i) => i);
    const idx = pick(pool.length);
    result.push(pool[idx] ?? 0);
    pool.splice(idx, 1);
  }
  return result;
}

export function selectPassages(
  rangeAyahs: Ayah[],
  options: Omit<StartSelectionOptions, "rangeLength">,
): Ayah[][] {
  return selectStartIndices({ ...options, rangeLength: rangeAyahs.length }).map((start) =>
    rangeAyahs.slice(start, start + options.ayahsPerRound),
  );
}

const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
// Standalone Quranic annotation marks (waqf signs, etc.) are not counted as words.
const MARK_ONLY = /^[\u06D6-\u06ED\u08D3-\u08FF\u0610-\u061A]+$/;

export interface PromptExcerpt {
  words: string;
  truncated: boolean;
  /** The source prefixes ayah 1 of most surahs with the Basmalah; it is skipped in the prompt only. */
  basmalahOmitted: boolean;
}

export function buildPromptExcerpt(
  ayah: Pick<Ayah, "text" | "surahNumber" | "ayahNumber">,
  maxWords = 3,
): PromptExcerpt {
  let text = ayah.text.replace(/^\uFEFF/, "").trim();
  let basmalahOmitted = false;
  if (ayah.ayahNumber === 1 && ayah.surahNumber !== 1 && text.startsWith(BASMALAH)) {
    const rest = text.slice(BASMALAH.length).trim();
    if (rest.length > 0) {
      text = rest;
      basmalahOmitted = true;
    }
  }
  const tokens = text.split(/\s+/).filter((t) => t.length > 0 && !MARK_ONLY.test(t));
  // Never reveal a whole multi-word ayah: show at most half of it.
  const count = Math.max(1, Math.min(maxWords, Math.floor(tokens.length / 2) || 1));
  return {
    words: tokens.slice(0, count).join(" "),
    truncated: count < tokens.length,
    basmalahOmitted,
  };
}
