import { toArabicNumerals } from "@/lib/format";
import type { Ayah } from "@/lib/quran/types";
import { cn } from "@/lib/utils";
import type { PassageCorrections } from "@/lib/assessment/corrections";
import { CorrectionPassage } from "./correction-passage";

/** Full review text, rendered exactly as returned by the source, with a separate ayah marker. */
export function PassageText({ ayahs, className, corrections }: { ayahs: Ayah[]; className?: string | undefined; corrections?: PassageCorrections | undefined }) {
  if (corrections) return <CorrectionPassage ayahs={ayahs} report={corrections} className={className} />;
  return (
    <div lang="ar" dir="rtl" className={cn("quran-text text-2xl text-foreground sm:text-3xl", className)}>
      {ayahs.map((a) => (
        <span key={a.key}>
          {a.text}
          <span className="mx-1.5 inline-block whitespace-nowrap text-[0.8em] text-gold" aria-label={`ayah ${a.ayahNumber}`}>
            ﴿{toArabicNumerals(a.ayahNumber)}﴾
          </span>{" "}
        </span>
      ))}
    </div>
  );
}
