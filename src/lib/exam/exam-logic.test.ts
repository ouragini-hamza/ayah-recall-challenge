import { describe, expect, it } from "vitest";

import type { Ayah, QuranMeta } from "@/lib/quran/types";
import { countAyahsInRange, juzOfPosition, rangeBounds, validateSettings } from "./range";
import { buildPromptExcerpt, selectPassages, selectStartIndices } from "./selection";

// Real counts for the first three surahs and the first four juz starts.
const meta: QuranMeta = {
  surahs: [
    { number: 1, nameArabic: "", nameEnglish: "Al-Faatiha", translation: "", ayahCount: 7 },
    { number: 2, nameArabic: "", nameEnglish: "Al-Baqara", translation: "", ayahCount: 286 },
    { number: 3, nameArabic: "", nameEnglish: "Aal-i-Imraan", translation: "", ayahCount: 200 },
  ],
  juzStarts: [
    { juz: 1, surah: 1, ayah: 1 },
    { juz: 2, surah: 2, ayah: 142 },
    { juz: 3, surah: 2, ayah: 253 },
    { juz: 4, surah: 3, ayah: 93 },
  ],
};

const base = { rounds: 5, ayahsPerRound: 5 };

function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe("range validation", () => {
  it("counts Juz 1 as Al-Fatiha plus Al-Baqara 1–141 (148 ayahs)", () => {
    expect(countAyahsInRange({ kind: "juz", startJuz: 1, endJuz: 1 }, meta)).toBe(148);
  });

  it("Juz 1–2 ends right before Al-Baqara 253", () => {
    expect(rangeBounds({ kind: "juz", startJuz: 1, endJuz: 2 }, meta)).toEqual({ startGlobal: 1, endGlobal: 7 + 252 });
  });

  it("finds the juz of a verse", () => {
    expect(juzOfPosition({ surah: 2, ayah: 141 }, meta)).toBe(1);
    expect(juzOfPosition({ surah: 2, ayah: 142 }, meta)).toBe(2);
    expect(juzOfPosition({ surah: 3, ayah: 100 }, meta)).toBe(4);
  });

  it("rejects a starting Juz after the ending Juz", () => {
    const r = validateSettings({ ...base, range: { kind: "juz", startJuz: 3, endJuz: 2 } }, meta);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("juzOrder");
  });

  it("rejects an ayah number beyond the surah's length", () => {
    const r = validateSettings(
      { ...base, range: { kind: "surah", start: { surah: 1, ayah: 1 }, end: { surah: 1, ayah: 8 } } },
      meta,
    );
    expect(r.issues).toContainEqual({ code: "ayahOutOfBounds", which: "end", max: 7 });
  });

  it("rejects a range whose start comes after its end", () => {
    const r = validateSettings(
      { ...base, range: { kind: "surah", start: { surah: 2, ayah: 10 }, end: { surah: 2, ayah: 5 } } },
      meta,
    );
    expect(r.issues.map((i) => i.code)).toContain("rangeOrder");
  });

  it("rejects a range shorter than the ayahs per round", () => {
    const r = validateSettings(
      { rounds: 1, ayahsPerRound: 5, range: { kind: "surah", start: { surah: 2, ayah: 1 }, end: { surah: 2, ayah: 4 } } },
      meta,
    );
    expect(r.issues).toContainEqual({ code: "rangeTooShort", available: 4, needed: 5 });
  });

  it("limits rounds and ayahs per round to 1–20", () => {
    const range = { kind: "juz" as const, startJuz: 1, endJuz: 1 };
    expect(validateSettings({ rounds: 21, ayahsPerRound: 5, range }, meta).issues.map((i) => i.code)).toContain("roundsOutOfBounds");
    expect(validateSettings({ rounds: 0, ayahsPerRound: 5, range }, meta).issues.map((i) => i.code)).toContain("roundsOutOfBounds");
    expect(validateSettings({ rounds: 5, ayahsPerRound: 21, range }, meta).issues.map((i) => i.code)).toContain("ayahsPerRoundOutOfBounds");
    expect(validateSettings({ rounds: 20, ayahsPerRound: 20, range }, meta).ok).toBe(true);
  });

  it("reports distinct start count as available − ayahsPerRound + 1", () => {
    const r = validateSettings(
      { rounds: 5, ayahsPerRound: 5, range: { kind: "surah", start: { surah: 2, ayah: 1 }, end: { surah: 2, ayah: 10 } } },
      meta,
    );
    expect(r.distinctStarts).toBe(6);
  });
});

describe("random passage selection", () => {
  it("never picks a start whose passage would cross the range end", () => {
    const starts = selectStartIndices({ rangeLength: 10, ayahsPerRound: 5, rounds: 50, avoidRepeats: false, rng: seq(0.9999, 0, 0.5) });
    starts.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s + 5).toBeLessThanOrEqual(10);
    });
    expect(Math.max(...starts)).toBe(5);
  });

  it("does not repeat a start while unused starts remain", () => {
    const starts = selectStartIndices({ rangeLength: 10, ayahsPerRound: 5, rounds: 6, avoidRepeats: true });
    expect(new Set(starts).size).toBe(6);
  });

  it("allows repeats only after every valid start has been used", () => {
    const starts = selectStartIndices({ rangeLength: 3, ayahsPerRound: 2, rounds: 5, avoidRepeats: true });
    expect(new Set(starts.slice(0, 2)).size).toBe(2);
    expect(new Set(starts.slice(2, 4)).size).toBe(2);
    expect(starts).toHaveLength(5);
  });

  it("returns nothing when the range is shorter than a passage", () => {
    expect(selectStartIndices({ rangeLength: 3, ayahsPerRound: 4, rounds: 2, avoidRepeats: true })).toEqual([]);
  });

  it("builds consecutive passages of the requested length", () => {
    const ayahs = Array.from({ length: 12 }, (_, i) => ({ key: `2:${i + 1}`, globalNumber: i + 8 }) as unknown as Ayah);
    const passages = selectPassages(ayahs, { ayahsPerRound: 4, rounds: 3, avoidRepeats: true, rng: seq(0.5) });
    passages.forEach((p) => {
      expect(p).toHaveLength(4);
      for (let i = 1; i < p.length; i++) expect(p[i]!.globalNumber).toBe(p[i - 1]!.globalNumber + 1);
    });
  });
});

describe("prompt excerpt", () => {
  it("shows at most three words with an ellipsis flag", () => {
    const e = buildPromptExcerpt({ surahNumber: 2, ayahNumber: 2, text: "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ" });
    expect(e.words).toBe("ذَٰلِكَ ٱلْكِتَٰبُ لَا");
    expect(e.truncated).toBe(true);
  });

  it("skips the source's Basmalah prefix on ayah 1 of later surahs", () => {
    const e = buildPromptExcerpt({ surahNumber: 2, ayahNumber: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الٓمٓ" });
    expect(e.words).toBe("الٓمٓ");
    expect(e.basmalahOmitted).toBe(true);
  });

  it("keeps the Basmalah for Al-Fatiha 1 and never shows the full multi-word ayah", () => {
    const e = buildPromptExcerpt({ surahNumber: 1, ayahNumber: 1, text: "\uFEFFبِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" });
    expect(e.basmalahOmitted).toBe(false);
    expect(e.words).toBe("بِسْمِ ٱللَّهِ");
    expect(e.truncated).toBe(true);
  });
});
