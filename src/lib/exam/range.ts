/** Pure range math based on source metadata (no network). */
import type { QuranMeta, RangeSelection, VersePosition } from "@/lib/quran/types";
import { TOTAL_JUZ } from "@/lib/quran/types";

export const LIMITS = {
  rounds: { min: 1, max: 20, default: 5 },
  ayahsPerRound: { min: 1, max: 20, default: 5 },
} as const;

function prefixCounts(meta: QuranMeta): number[] {
  // prefix[i] = number of ayahs before surah (i + 1)
  const prefix: number[] = [];
  let acc = 0;
  for (const s of meta.surahs) {
    prefix.push(acc);
    acc += s.ayahCount;
  }
  return prefix;
}

export function totalAyahs(meta: QuranMeta): number {
  return meta.surahs.reduce((sum, s) => sum + s.ayahCount, 0);
}

/** 1-based mushaf position of a verse. */
export function toGlobal(pos: VersePosition, meta: QuranMeta): number {
  return (prefixCounts(meta)[pos.surah - 1] ?? 0) + pos.ayah;
}

export function juzOfPosition(pos: VersePosition, meta: QuranMeta): number {
  const g = toGlobal(pos, meta);
  let juz = 1;
  for (const start of meta.juzStarts) {
    if (toGlobal(start, meta) <= g) juz = start.juz;
  }
  return juz;
}

export function rangeBounds(
  range: RangeSelection,
  meta: QuranMeta,
): { startGlobal: number; endGlobal: number } {
  if (range.kind === "surah") {
    return { startGlobal: toGlobal(range.start, meta), endGlobal: toGlobal(range.end, meta) };
  }
  const first = meta.juzStarts[range.startJuz - 1];
  if (!first) return { startGlobal: 1, endGlobal: 0 };
  const startGlobal = toGlobal(first, meta);
  const next = meta.juzStarts[range.endJuz];
  const endGlobal = next ? toGlobal(next, meta) - 1 : totalAyahs(meta);
  return { startGlobal, endGlobal };
}

export function countAyahsInRange(range: RangeSelection, meta: QuranMeta): number {
  const { startGlobal, endGlobal } = rangeBounds(range, meta);
  return Math.max(0, endGlobal - startGlobal + 1);
}

export type ValidationIssue =
  | { code: "juzOutOfBounds" }
  | { code: "juzOrder" }
  | { code: "surahOutOfBounds" }
  | { code: "ayahOutOfBounds"; which: "start" | "end"; max: number }
  | { code: "rangeOrder" }
  | { code: "roundsOutOfBounds" }
  | { code: "ayahsPerRoundOutOfBounds" }
  | { code: "rangeTooShort"; available: number; needed: number };

export interface ValidationInput {
  range: RangeSelection;
  rounds: number;
  ayahsPerRound: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** Ayahs inside the range (0 when the range itself is invalid). */
  available: number;
  /** Distinct valid start ayahs given ayahsPerRound. */
  distinctStarts: number;
}

function isInt(n: number) {
  return Number.isInteger(n);
}

export function validateSettings(input: ValidationInput, meta: QuranMeta): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { range, rounds, ayahsPerRound } = input;

  if (!isInt(rounds) || rounds < LIMITS.rounds.min || rounds > LIMITS.rounds.max) {
    issues.push({ code: "roundsOutOfBounds" });
  }
  if (
    !isInt(ayahsPerRound) ||
    ayahsPerRound < LIMITS.ayahsPerRound.min ||
    ayahsPerRound > LIMITS.ayahsPerRound.max
  ) {
    issues.push({ code: "ayahsPerRoundOutOfBounds" });
  }

  let rangeValid = true;
  if (range.kind === "juz") {
    const maxJuz = Math.min(TOTAL_JUZ, meta.juzStarts.length);
    const inBounds = (j: number) => isInt(j) && j >= 1 && j <= maxJuz;
    if (!inBounds(range.startJuz) || !inBounds(range.endJuz)) {
      issues.push({ code: "juzOutOfBounds" });
      rangeValid = false;
    } else if (range.startJuz > range.endJuz) {
      issues.push({ code: "juzOrder" });
      rangeValid = false;
    }
  } else {
    const surahOk = (s: number) => isInt(s) && s >= 1 && s <= meta.surahs.length;
    if (!surahOk(range.start.surah) || !surahOk(range.end.surah)) {
      issues.push({ code: "surahOutOfBounds" });
      rangeValid = false;
    } else {
      for (const which of ["start", "end"] as const) {
        const pos = range[which];
        const max = meta.surahs[pos.surah - 1]?.ayahCount ?? 0;
        if (!isInt(pos.ayah) || pos.ayah < 1 || pos.ayah > max) {
          issues.push({ code: "ayahOutOfBounds", which, max });
          rangeValid = false;
        }
      }
      if (rangeValid && toGlobal(range.start, meta) > toGlobal(range.end, meta)) {
        issues.push({ code: "rangeOrder" });
        rangeValid = false;
      }
    }
  }

  const available = rangeValid ? countAyahsInRange(range, meta) : 0;
  if (rangeValid && isInt(ayahsPerRound) && ayahsPerRound >= 1 && available < ayahsPerRound) {
    issues.push({ code: "rangeTooShort", available, needed: ayahsPerRound });
  }
  const distinctStarts = rangeValid ? Math.max(0, available - ayahsPerRound + 1) : 0;

  return { ok: issues.length === 0, issues, available, distinctStarts };
}
