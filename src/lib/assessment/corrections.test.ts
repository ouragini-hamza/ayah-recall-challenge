import { describe, expect, it } from "vitest";
import type { Ayah } from "@/lib/quran/types";
import { getAssessmentProvider } from "./adapter";
import { mapAlignedCorrections, sourceWords, validateCorrections, type AlignedAyahEvidence } from "./corrections";

// Synthetic Arabic fixture, not Quran text and never shown as a user's analysis.
const text = "كَتَبَ  طَالِبٌ\nدَرْسًا";
const ayah: Ayah = { key: "1:1", text, globalNumber: 1, surahNumber: 1, surahNameArabic: "", surahNameEnglish: "", ayahNumber: 1, juz: 1 };
const issue = { id: "test-issue", category: "omitted" as const, wordSpan: { start: 1, end: 2 }, explanation: "You omitted this word", confidence: 0.9, reviewNeeded: false };
function evidence(): [AlignedAyahEvidence] {
  return [{ ayahKey: ayah.key, referenceText: text, complete: true, reviewNeeded: false, issues: [issue] }];
}

describe("Source-anchored corrections", () => {
  it("retains every original diacritic and whitespace when anchoring words", () => {
    const result = mapAlignedCorrections([ayah], evidence());
    const span = result.ayahs[0]?.issues[0]?.sourceSpan;
    expect(span).toEqual({ start: 9, end: 16, text: "طَالِبٌ" });
    expect(span && text.slice(0, span.start) + span.text + text.slice(span.end)).toBe(text);
    expect(sourceWords(text).length).toBe(3);
  });
  it("rejects evidence for a different locked ayah", () => {
    const input = evidence(); input[0].ayahKey = "1:2";
    expect(mapAlignedCorrections([ayah], input).ayahs[0]).toMatchObject({ state: "needs_review", issues: [] });
  });
  it("rejects even normalized source text as a different reference", () => {
    const input = evidence(); input[0].referenceText = "كتب طالب درسا";
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.state).toBe("needs_review");
  });
  it("does not label unanalysed ayahs correct", () => {
    expect(mapAlignedCorrections([ayah], []).ayahs[0]?.state).toBe("needs_review");
  });
  it("requires complete evidence for the no-errors indicator", () => {
    const input = evidence(); input[0].issues = [];
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.state).toBe("correct");
    input[0].complete = false;
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.state).toBe("needs_review");
  });
  it("keeps uncertain evidence in needs-review state", () => {
    const input = evidence(); input[0].issues[0] = { ...issue, reviewNeeded: true };
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.state).toBe("needs_review");
  });
  it("rejects invalid and overlapping word spans", () => {
    const input = evidence(); input[0].issues[0] = { ...issue, wordSpan: { start: 1, end: 9 } };
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.issues).toEqual([]);
    input[0].issues = [issue, { ...issue, id: "overlap" }];
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.state).toBe("needs_review");
  });
  it("anchors insertions without inserting text into the original passage", () => {
    const input = evidence(); input[0].issues[0] = { ...issue, category: "inserted_repeated" };
    expect(mapAlignedCorrections([ayah], input).ayahs[0]?.referenceText).toBe(text);
  });
  it("recomputes character offsets rather than trusting provider offsets", () => {
    const report = mapAlignedCorrections([ayah], evidence());
    const mapped = report.ayahs[0]?.issues[0];
    if (!mapped) throw new Error("Missing fixture issue");
    mapped.sourceSpan = { start: 0, end: 1, text: "wrong" };
    expect(validateCorrections([ayah], report).ayahs[0]?.issues[0]?.sourceSpan.text).toBe("طَالِبٌ");
  });
  it("reports setup needed without fabricated analysis or audio uploads", async () => {
    expect(getAssessmentProvider().isConfigured).toBe(false);
    expect(await getAssessmentProvider().assess({ audio: new Blob(["test"]), expected: [ayah] })).toEqual({ status: "setup_needed", providerId: "tajweedformer-v4" });
    expect((await getAssessmentProvider().assess({ audio: null, expected: [ayah] })).status).toBe("no_recording");
  });
});