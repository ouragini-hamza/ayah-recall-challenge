import { describe, expect, it } from "vitest";

import type { Ayah } from "@/lib/quran/types";
import { normalizeWord } from "./arabic";
import { mapAlignedCorrections } from "./corrections";
import { alignWords, diffToEvidence, diffTranscript } from "./word-diff";

const texts = [
  "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
  "ٱللَّهُ ٱلصَّمَدُ",
  "لَمْ يَلِدْ وَلَمْ يُولَدْ",
  "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
];
const ikhlas: Ayah[] = texts.map((text, i) => ({
  key: `112:${i + 1}` as Ayah["key"],
  globalNumber: 6222 + i,
  surahNumber: 112,
  surahNameArabic: "الإخلاص",
  surahNameEnglish: "Al-Ikhlas",
  ayahNumber: i + 1,
  juz: 30,
  text,
}));
const PROMPT = 2; // "قل هو" is shown, not recited

function run(transcript: string, promptWords = PROMPT) {
  const diff = diffTranscript(ikhlas, transcript, promptWords);
  const { evidence, mistakes } = diffToEvidence(ikhlas, diff);
  return { diff, mistakes, report: mapAlignedCorrections(ikhlas, evidence) };
}

const FULL = "الله احد الله الصمد لم يلد ولم يولد ولم يكن له كفوا احد";

describe("normalizeWord", () => {
  it("removes diacritics and unifies letter variants", () => {
    expect(normalizeWord("ٱللَّهُ")).toBe("الله");
    expect(normalizeWord("أَحَدٌۢ")).toBe("احد");
    expect(normalizeWord("هُدًى")).toBe("هدي");
  });
});

describe("alignWords", () => {
  it("returns only matches for identical sequences", () => {
    const ops = alignWords(["a", "b"], ["a", "b"]);
    expect(ops.every((o) => o.type === "match")).toBe(true);
  });
});

describe("diffTranscript", () => {
  it("reports no issues for a perfect recitation", () => {
    const { report, mistakes } = run(FULL);
    expect(mistakes).toEqual([]);
    expect(report.ayahs.map((a) => a.state)).toEqual(["correct", "correct", "correct", "correct"]);
  });

  it("does not penalise repeating the shown prompt words", () => {
    const { report } = run(`قل هو ${FULL}`);
    expect(report.ayahs.every((a) => a.state === "correct")).toBe(true);
  });

  it("flags an omitted word with its Uthmani source span", () => {
    const { report, mistakes } = run(FULL.replace("الصمد ", ""));
    expect(report.ayahs[1]?.state).toBe("issues");
    expect(report.ayahs[1]?.issues[0]?.category).toBe("omitted");
    expect(report.ayahs[1]?.issues[0]?.sourceSpan.text).toBe("ٱلصَّمَدُ");
    expect(mistakes[0]).toMatchObject({ ayahKey: "112:2", kind: "missed" });
  });

  it("flags a clearly different word as substituted", () => {
    const { report } = run(FULL.replace("الصمد", "النور"));
    const issue = report.ayahs[1]?.issues[0];
    expect(issue?.category).toBe("substituted");
    expect(issue?.explanation).toContain("النور");
  });

  it("treats a one-letter near miss as a pronunciation doubt needing review", () => {
    const { report } = run(FULL.replace("الصمد", "الصبد"));
    expect(report.ayahs[1]?.issues[0]?.category).toBe("pronunciation");
    expect(report.ayahs[1]?.state).toBe("needs_review");
  });

  it("anchors an extra word to the adjacent reference word", () => {
    const { report, mistakes } = run(FULL.replace("لم يلد", "لم هنا يلد"));
    const issues = report.ayahs[2]?.issues ?? [];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.category).toBe("inserted_repeated");
    expect(mistakes.some((m) => m.kind === "added")).toBe(true);
  });

  it("marks everything omitted when the recitation stops early", () => {
    const { report } = run("الله احد الله الصمد");
    expect(report.ayahs[0]?.state).toBe("correct");
    expect(report.ayahs[2]?.issues[0]?.category).toBe("omitted");
    expect(report.ayahs[3]?.issues[0]?.category).toBe("omitted");
  });

  it("falls back to needs_review when nothing was heard", () => {
    const { report } = run("   ");
    expect(report.ayahs.every((a) => a.state === "needs_review")).toBe(true);
  });
});
