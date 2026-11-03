/** Stable ayah key in "surah:ayah" form, e.g. "2:255". */
export type AyahKey = `${number}:${number}`;

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  translation: string;
  ayahCount: number;
}

export interface JuzStart {
  juz: number;
  surah: number;
  ayah: number;
}

export interface QuranMeta {
  surahs: SurahMeta[];
  /** Start position of each juz (index 0 = juz 1), as published by the source. */
  juzStarts: JuzStart[];
}

export interface Ayah {
  key: AyahKey;
  /** Position in the mushaf, 1..6236. */
  globalNumber: number;
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  ayahNumber: number;
  juz: number;
  /** Arabic Uthmani text, exactly as returned by the source. */
  text: string;
}

export interface VersePosition {
  surah: number;
  ayah: number;
}

export type RangeSelection =
  | { kind: "juz"; startJuz: number; endJuz: number }
  | { kind: "surah"; start: VersePosition; end: VersePosition };

export const TOTAL_JUZ = 30;

export function ayahKey(surah: number, ayah: number): AyahKey {
  return `${surah}:${ayah}` as AyahKey;
}
