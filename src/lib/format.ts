import type { Ayah, QuranMeta, RangeSelection } from "@/lib/quran/types";

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function describeRange(range: RangeSelection, meta: QuranMeta): string {
  if (range.kind === "juz") {
    return range.startJuz === range.endJuz
      ? `Juz ${range.startJuz}`
      : `Juz ${range.startJuz} – ${range.endJuz}`;
  }
  const s = meta.surahs[range.start.surah - 1];
  const e = meta.surahs[range.end.surah - 1];
  if (!s || !e) return "—";
  if (s.number === e.number) {
    return `${s.nameEnglish} ${s.number}:${range.start.ayah}–${range.end.ayah}`;
  }
  return `${s.nameEnglish} ${s.number}:${range.start.ayah} – ${e.nameEnglish} ${e.number}:${range.end.ayah}`;
}

export function passageReference(ayahs: Ayah[]): string {
  if (ayahs.length === 0) return "";
  const first = ayahs[0];
  const last = ayahs[ayahs.length - 1];
  if (first.surahNumber === last.surahNumber) {
    return first.ayahNumber === last.ayahNumber
      ? `${first.surahNameEnglish} ${first.key}`
      : `${first.surahNameEnglish} ${first.key}–${last.ayahNumber}`;
  }
  return `${first.surahNameEnglish} ${first.key} – ${last.surahNameEnglish} ${last.key}`;
}

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export function toArabicNumerals(n: number): string {
  return String(n).replace(/\d/g, (d) => arabicDigits[Number(d)]);
}
