/**
 * Quran data access. All network calls to the Quran text source live here so
 * the provider can be swapped without touching UI code.
 *
 * Source: AlQuran Cloud API (https://alquran.cloud/api), edition "quran-uthmani".
 * Each ayah carries its own juz number from the source, so juz ranges are exact.
 */
import { rangeBounds, juzOfPosition } from "@/lib/exam/range";
import type { Ayah, QuranMeta, RangeSelection, SurahMeta } from "./types";
import { ayahKey } from "./types";

export const QURAN_SOURCE = {
  name: "AlQuran Cloud API",
  url: "https://alquran.cloud/api",
  edition: "quran-uthmani",
  editionLabel: "Uthmani script (Tanzil project text)",
  tanzilUrl: "https://tanzil.net",
} as const;

const BASE_URL = "https://api.alquran.cloud/v1";

export class QuranSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuranSourceError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`);
  } catch {
    throw new QuranSourceError("Could not reach the Quran text source. Check your connection.");
  }
  if (!res.ok) {
    throw new QuranSourceError(`The Quran text source responded with status ${res.status}.`);
  }
  const body = (await res.json()) as { code: number; data: T };
  if (body.code !== 200 || !body.data) {
    throw new QuranSourceError("The Quran text source returned an unexpected response.");
  }
  return body.data;
}

interface RawMeta {
  surahs: {
    references: {
      number: number;
      name: string;
      englishName: string;
      englishNameTranslation: string;
      numberOfAyahs: number;
    }[];
  };
  juzs: { references: { surah: number; ayah: number }[] };
}

export async function fetchQuranMeta(): Promise<QuranMeta> {
  const raw = await getJson<RawMeta>("/meta");
  const surahs: SurahMeta[] = raw.surahs.references.map((s) => ({
    number: s.number,
    nameArabic: s.name,
    nameEnglish: s.englishName,
    translation: s.englishNameTranslation,
    ayahCount: s.numberOfAyahs,
  }));
  const juzStarts = raw.juzs.references.map((r, i) => ({ juz: i + 1, surah: r.surah, ayah: r.ayah }));
  return { surahs, juzStarts };
}

interface RawJuz {
  ayahs: {
    number: number;
    text: string;
    numberInSurah: number;
    juz: number;
    surah: { number: number; name: string; englishName: string };
  }[];
}

const juzCache = new Map<number, Promise<Ayah[]>>();

export function fetchJuz(juz: number): Promise<Ayah[]> {
  const cached = juzCache.get(juz);
  if (cached) return cached;
  const promise = getJson<RawJuz>(`/juz/${juz}/${QURAN_SOURCE.edition}`)
    .then((raw) =>
      raw.ayahs.map<Ayah>((a) => ({
        key: ayahKey(a.surah.number, a.numberInSurah),
        globalNumber: a.number,
        surahNumber: a.surah.number,
        surahNameArabic: a.surah.name,
        surahNameEnglish: a.surah.englishName,
        ayahNumber: a.numberInSurah,
        juz: a.juz,
        text: a.text,
      })),
    )
    .catch((err) => {
      juzCache.delete(juz);
      throw err;
    });
  juzCache.set(juz, promise);
  return promise;
}

/** Load every ayah inside the selection, in mushaf order, never crossing its bounds. */
export async function loadRangeAyahs(range: RangeSelection, meta: QuranMeta): Promise<Ayah[]> {
  const { startGlobal, endGlobal } = rangeBounds(range, meta);
  const firstJuz = range.kind === "juz" ? range.startJuz : juzOfPosition(range.start, meta);
  const lastJuz = range.kind === "juz" ? range.endJuz : juzOfPosition(range.end, meta);
  const juzNumbers: number[] = [];
  for (let j = firstJuz; j <= lastJuz; j++) juzNumbers.push(j);
  const chunks = await Promise.all(juzNumbers.map(fetchJuz));
  const seen = new Set<string>();
  const ayahs: Ayah[] = [];
  for (const chunk of chunks) {
    for (const a of chunk) {
      if (a.globalNumber < startGlobal || a.globalNumber > endGlobal) continue;
      if (seen.has(a.key)) continue;
      seen.add(a.key);
      ayahs.push(a);
    }
  }
  ayahs.sort((a, b) => a.globalNumber - b.globalNumber);
  const expected = endGlobal - startGlobal + 1;
  if (ayahs.length !== expected) {
    throw new QuranSourceError(
      `Expected ${expected} ayahs for this range but received ${ayahs.length}. Please try again.`,
    );
  }
  return ayahs;
}
