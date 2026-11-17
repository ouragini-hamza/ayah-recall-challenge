import type { Ayah, AyahKey } from "@/lib/quran/types";

export type CorrectionCategory = "substituted" | "omitted" | "inserted_repeated" | "pronunciation";

/** Zero-based, end-exclusive word and UTF-16 source spans. Never index normalized display text. */
export interface CorrectionIssue {
  id: string;
  category: CorrectionCategory;
  ayahKey: AyahKey;
  wordSpan: { start: number; end: number };
  sourceSpan: { start: number; end: number; text: string };
  explanation: string;
  confidence: number | null;
  reviewNeeded: boolean;
}

export interface AyahCorrection {
  ayahKey: AyahKey;
  referenceText: string;
  state: "correct" | "issues" | "needs_review";
  issues: CorrectionIssue[];
}

export interface PassageCorrections {
  ayahs: AyahCorrection[];
}

/** Input ONLY from a reliable provider-specific phoneme-to-reference alignment layer.
 * This is not an SDK output shape and does not infer word errors from sound signals.
 * Insertions/repetitions anchor to the adjacent reference word, never added Quran text.
 */
export interface AlignedAyahEvidence {
  ayahKey: AyahKey;
  referenceText: string;
  complete: boolean;
  reviewNeeded: boolean;
  issues: Omit<CorrectionIssue, "ayahKey" | "sourceSpan">[];
}

export function sourceWords(text: string) {
  return Array.from(text.matchAll(/\S+/gu), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
  }));
}

/** Fail closed on changed passages, invalid spans, duplicate IDs and overlapping evidence. */
export function mapAlignedCorrections(
  expected: readonly Ayah[],
  evidence: readonly AlignedAyahEvidence[],
): PassageCorrections {
  const samePassage = evidence.length === expected.length && expected.every((ayah, i) =>
    evidence[i]?.ayahKey === ayah.key && evidence[i]?.referenceText === ayah.text,
  );
  const ids = new Set<string>();
  return {
    ayahs: expected.map((ayah, i) => {
      const review: AyahCorrection = {
        ayahKey: ayah.key, referenceText: ayah.text, state: "needs_review", issues: [],
      };
      const aligned = evidence[i];
      if (!samePassage || !aligned) return review;
      const words = sourceWords(ayah.text);
      const issues: CorrectionIssue[] = [];
      for (const issue of aligned.issues) {
        const { start, end } = issue.wordSpan;
        const first = words[start];
        const last = words[end - 1];
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start ||
          !first || !last || !issue.id || ids.has(issue.id) || !issue.explanation.trim() ||
          !["substituted", "omitted", "inserted_repeated", "pronunciation"].includes(issue.category) ||
          (issue.confidence !== null && (!Number.isFinite(issue.confidence) || issue.confidence < 0 || issue.confidence > 1)) ||
          issues.some((other) => start < other.wordSpan.end && end > other.wordSpan.start)) return review;
        ids.add(issue.id);
        issues.push({ ...issue, ayahKey: ayah.key, sourceSpan: {
          start: first.start, end: last.end, text: ayah.text.slice(first.start, last.end),
        } });
      }
      return {
        ...review,
        state: !aligned.complete || aligned.reviewNeeded || issues.some((issue) => issue.reviewNeeded)
          ? "needs_review" : issues.length ? "issues" : "correct",
        issues: issues.sort((a, b) => a.sourceSpan.start - b.sourceSpan.start),
      };
    }),
  };
}

/** Revalidate stored/provider annotations against this round, ignoring supplied character offsets. */
export function validateCorrections(expected: readonly Ayah[], report: PassageCorrections): PassageCorrections {
  return mapAlignedCorrections(expected, report.ayahs.map((ayah) => ({
    ayahKey: ayah.ayahKey,
    referenceText: ayah.referenceText,
    complete: ayah.state !== "needs_review",
    reviewNeeded: ayah.state === "needs_review",
    issues: ayah.issues,
  })));
}