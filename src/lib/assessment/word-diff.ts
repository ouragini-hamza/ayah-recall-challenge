/**
 * Word-level comparison of a recognised transcript with the reference passage.
 * Produces evidence for the existing, fail-closed correction contract.
 */
import type { Ayah } from "@/lib/quran/types";
import { normalizedTokens, normalizeWord, similarity } from "./arabic";
import { sourceWords, type AlignedAyahEvidence } from "./corrections";
import type { WordMistake } from "./adapter";

/** Words this similar (but not identical) are reported as a pronunciation doubt, not a substitution. */
export const NEAR_SIMILARITY = 0.75;
const NEAR_MIN_LENGTH = 4;
const BASMALAH_TOKENS = ["بسم", "الله", "الرحمن", "الرحيم"];

export interface ReferenceWord {
  ayahIndex: number;
  /** Index into sourceWords(ayah.text); this is what the correction contract uses. */
  wordIndex: number;
  text: string;
  norm: string;
}

export type DiffOp =
  | { type: "match"; ref: number; heard: number }
  | { type: "near"; ref: number; heard: number }
  | { type: "sub"; ref: number; heard: number }
  | { type: "del"; ref: number }
  | { type: "ins"; heard: number };

export interface WordDiff {
  /** Reference words that are actually compared (prompt and Basmalah excluded). */
  reference: ReferenceWord[];
  heard: string[];
  ops: DiffOp[];
}

function startsWithTokens(tokens: string[], prefix: string[]) {
  return prefix.length > 0 && prefix.every((p, i) => tokens[i] === p);
}

/** Reference words to compare. `promptWords` leading words of the passage were shown, not recited. */
export function buildReferenceWords(
  ayahs: readonly Ayah[],
  promptWords: number,
): { words: ReferenceWord[]; promptNorms: string[] } {
  const words: ReferenceWord[] = [];
  const promptNorms: string[] = [];
  let skipped = 0;
  ayahs.forEach((ayah, ayahIndex) => {
    const all = sourceWords(ayah.text).map((w, wordIndex) => ({
      ayahIndex,
      wordIndex,
      text: w.text,
      norm: normalizeWord(w.text),
    }));
    let alignable = all.filter((w) => w.norm.length > 0);
    // The source prefixes ayah 1 of most surahs with the Basmalah; it is optional to recite.
    if (
      ayah.ayahNumber === 1 &&
      ayah.surahNumber !== 1 &&
      startsWithTokens(
        alignable.map((w) => w.norm),
        BASMALAH_TOKENS,
      ) &&
      alignable.length > BASMALAH_TOKENS.length
    ) {
      alignable = alignable.slice(BASMALAH_TOKENS.length);
    }
    for (const word of alignable) {
      if (ayahIndex === 0 && skipped < promptWords) {
        skipped++;
        promptNorms.push(word.norm);
        continue;
      }
      words.push(word);
    }
  });
  return { words, promptNorms };
}

/** Drop a leading Basmalah or repeated prompt words from what was heard. */
export function trimHeard(heard: string[], promptNorms: string[], hasBasmalah: boolean): string[] {
  let out = heard;
  if (hasBasmalah && startsWithTokens(out, BASMALAH_TOKENS))
    out = out.slice(BASMALAH_TOKENS.length);
  if (startsWithTokens(out, promptNorms)) out = out.slice(promptNorms.length);
  return out;
}

function pairCost(ref: string, heard: string): { cost: number; kind: "match" | "near" | "sub" } {
  if (ref === heard) return { cost: 0, kind: "match" };
  if (
    Math.min(ref.length, heard.length) >= NEAR_MIN_LENGTH &&
    similarity(ref, heard) >= NEAR_SIMILARITY
  )
    return { cost: 0.5, kind: "near" };
  return { cost: 1, kind: "sub" };
}

/** Minimum-cost alignment between reference words and heard words. */
export function alignWords(reference: readonly string[], heard: readonly string[]): DiffOp[] {
  const m = reference.length;
  const n = heard.length;
  const cost: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) cost[i]![0] = i;
  for (let j = 1; j <= n; j++) cost[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const pair = pairCost(reference[i - 1]!, heard[j - 1]!).cost;
      cost[i]![j] = Math.min(
        cost[i - 1]![j - 1]! + pair,
        cost[i - 1]![j]! + 1,
        cost[i]![j - 1]! + 1,
      );
    }
  }
  const ops: DiffOp[] = [];
  let i = m;
  let j = n;
  const EPS = 1e-9;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const pair = pairCost(reference[i - 1]!, heard[j - 1]!);
      if (Math.abs(cost[i]![j]! - (cost[i - 1]![j - 1]! + pair.cost)) < EPS) {
        ops.push({ type: pair.kind, ref: i - 1, heard: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(cost[i]![j]! - (cost[i - 1]![j]! + 1)) < EPS) {
      ops.push({ type: "del", ref: i - 1 });
      i--;
    } else {
      ops.push({ type: "ins", heard: j - 1 });
      j--;
    }
  }
  return ops.reverse();
}

export function diffTranscript(
  ayahs: readonly Ayah[],
  transcript: string,
  promptWords: number,
): WordDiff {
  const { words, promptNorms } = buildReferenceWords(ayahs, promptWords);
  const first = ayahs[0];
  const hasBasmalah =
    !!first &&
    first.ayahNumber === 1 &&
    first.surahNumber !== 1 &&
    startsWithTokens(normalizedTokens(first.text), BASMALAH_TOKENS);
  const heard = trimHeard(normalizedTokens(transcript), promptNorms, hasBasmalah);
  return {
    reference: words,
    heard,
    ops: alignWords(
      words.map((w) => w.norm),
      heard,
    ),
  };
}

type IssueDraft = AlignedAyahEvidence["issues"][number];

/** Turn a diff into per-ayah evidence for mapAlignedCorrections. */
export function diffToEvidence(
  ayahs: readonly Ayah[],
  diff: WordDiff,
): { evidence: AlignedAyahEvidence[]; mistakes: WordMistake[] } {
  const { reference, heard, ops } = diff;
  const perAyah: IssueDraft[][] = ayahs.map(() => []);
  const byWord = new Map<string, IssueDraft>();
  const mistakes: WordMistake[] = [];
  let counter = 0;
  const wordKey = (ayahIndex: number, wordIndex: number) => `${ayahIndex}:${wordIndex}`;
  const add = (
    ref: ReferenceWord,
    category: IssueDraft["category"],
    explanation: string,
    reviewNeeded: boolean,
    endWordIndex = ref.wordIndex + 1,
  ) => {
    const issue: IssueDraft = {
      id: `w${++counter}`,
      category,
      wordSpan: { start: ref.wordIndex, end: endWordIndex },
      explanation,
      confidence: null,
      reviewNeeded,
    };
    perAyah[ref.ayahIndex]!.push(issue);
    for (let w = ref.wordIndex; w < endWordIndex; w++) byWord.set(wordKey(ref.ayahIndex, w), issue);
    return issue;
  };
  const keyOf = (ref: ReferenceWord) => ayahs[ref.ayahIndex]!.key;

  let lastRef: number | null = null;
  let lastHeard: string | null = null;
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.type === "match") {
      lastRef = op.ref;
      lastHeard = heard[op.heard]!;
    } else if (op.type === "sub" || op.type === "near") {
      const ref = reference[op.ref]!;
      const h = heard[op.heard]!;
      if (op.type === "sub") {
        add(ref, "substituted", `Expected "${ref.text}"; heard "${h}".`, false);
      } else {
        add(
          ref,
          "pronunciation",
          `Heard "${h}", very close to "${ref.text}". Possible pronunciation slip or recognition noise; please review.`,
          true,
        );
      }
      mistakes.push({
        ayahKey: keyOf(ref),
        wordIndex: ref.wordIndex,
        expected: ref.text,
        heard: h,
        kind: "substituted",
      });
      lastRef = op.ref;
      lastHeard = h;
    } else if (op.type === "del") {
      // Group consecutive omissions inside one ayah into a single span.
      const ref = reference[op.ref]!;
      let end = k;
      while (end + 1 < ops.length) {
        const next = ops[end + 1]!;
        if (next.type !== "del") break;
        const nextRef = reference[next.ref]!;
        if (nextRef.ayahIndex !== ref.ayahIndex) break;
        end++;
      }
      const last = reference[(ops[end] as { ref: number }).ref]!;
      const missing = [];
      for (let q = k; q <= end; q++) missing.push(reference[(ops[q] as { ref: number }).ref]!.text);
      add(ref, "omitted", `Not recited: ${missing.join(" ")}`, false, last.wordIndex + 1);
      for (let q = k; q <= end; q++) {
        const r = reference[(ops[q] as { ref: number }).ref]!;
        mistakes.push({
          ayahKey: keyOf(r),
          wordIndex: r.wordIndex,
          expected: r.text,
          kind: "missed",
        });
      }
      lastRef = (ops[end] as { ref: number }).ref;
      k = end;
    } else {
      const h = heard[op.heard]!;
      // Anchor to the previous reference word, else the next one; never add Quran text.
      let anchor = lastRef;
      if (anchor === null) {
        const next = ops.slice(k + 1).find((o) => "ref" in o) as { ref: number } | undefined;
        anchor = next ? next.ref : null;
      }
      if (anchor === null) continue;
      const ref = reference[anchor]!;
      const repeated = lastHeard === h;
      const note = repeated ? `Repeated word heard: "${h}".` : `Extra word heard: "${h}".`;
      const existing = byWord.get(wordKey(ref.ayahIndex, ref.wordIndex));
      if (existing) {
        existing.explanation += ` ${note}`;
      } else {
        add(ref, "inserted_repeated", note, false);
      }
      mistakes.push({
        ayahKey: keyOf(ref),
        wordIndex: ref.wordIndex,
        expected: ref.text,
        heard: h,
        kind: repeated ? "repeated" : "added",
      });
      lastHeard = h;
    }
  }

  const complete = heard.length > 0;
  const evidence = ayahs.map((ayah, i) => ({
    ayahKey: ayah.key,
    referenceText: ayah.text,
    complete,
    reviewNeeded: false,
    issues: perAyah[i]!.sort((a, b) => a.wordSpan.start - b.wordSpan.start),
  }));
  return { evidence, mistakes };
}
