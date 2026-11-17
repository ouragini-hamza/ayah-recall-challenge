import { Check, CircleHelp, Minus, Plus, Speech, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { validateCorrections, type CorrectionCategory, type CorrectionIssue, type PassageCorrections } from "@/lib/assessment/corrections";
import { toArabicNumerals } from "@/lib/format";
import { format, useStrings } from "@/lib/i18n";
import type { Ayah } from "@/lib/quran/types";
import { cn } from "@/lib/utils";

const categories = ["substituted", "omitted", "inserted_repeated", "pronunciation"] as const;
const icons = { substituted: X, omitted: Minus, inserted_repeated: Plus, pronunciation: Speech };
const tones: Record<CorrectionCategory, string> = {
  substituted: "bg-destructive-soft text-destructive decoration-solid",
  omitted: "bg-warning-soft text-warning decoration-dashed",
  inserted_repeated: "bg-gold-soft text-gold-foreground decoration-double",
  pronunciation: "bg-correction-pronunciation-soft text-correction-pronunciation decoration-dotted",
};

function IssueSpan({ issue, uncertain }: { issue: CorrectionIssue; uncertain: boolean }) {
  const t = useStrings();
  const [open, setOpen] = useState(false);
  const explanationId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon = uncertain ? CircleHelp : icons[issue.category];
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  const show = () => { cancelClose(); setOpen(true); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="correction" size="inline" type="button"
          className={cn(tones[issue.category], uncertain && "bg-muted text-muted-foreground decoration-dashed")}
          aria-label={`${issue.sourceSpan.text}: ${uncertain ? t.correction.needsReview : t.correction[issue.category]}`}
          aria-describedby={open ? explanationId : undefined}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }}
          onPointerLeave={(event) => { if (event.pointerType === "mouse") scheduleClose(); }}
          onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(); }}
        >
          {issue.sourceSpan.text}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        dir="ltr" className="max-w-[calc(100vw-2rem)] font-sans text-sm leading-normal"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={cancelClose} onPointerLeave={scheduleClose}
        onFocusCapture={cancelClose}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-2 font-medium"><Icon className="size-4 shrink-0" aria-hidden />
            {uncertain ? t.correction.needsReview : t.correction[issue.category]}
          </p>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label={t.correction.close} onClick={() => setOpen(false)}><X /></Button>
        </div>
        <p id={explanationId} className="mt-2 text-muted-foreground">{issue.explanation}</p>
      </PopoverContent>
    </Popover>
  );
}

export function CorrectionPassage({ ayahs, report, className }: {
  ayahs: Ayah[]; report: PassageCorrections; className?: string | undefined;
}) {
  const t = useStrings();
  const safeReport = validateCorrections(ayahs, report);
  return (
    <div className={cn("grid gap-4", className)}>
      {ayahs.map((ayah, index) => {
        const correction = safeReport.ayahs[index];
        const issues = correction?.issues ?? [];
        let cursor = 0;
        const parts = issues.map((issue) => {
          const before = ayah.text.slice(cursor, issue.sourceSpan.start);
          cursor = issue.sourceSpan.end;
          return <span key={issue.id}>{before}<IssueSpan issue={issue} uncertain={issue.reviewNeeded || correction?.state === "needs_review"} /></span>;
        });
        return (
          <div key={ayah.key}>
            <p lang="ar" dir="rtl" className="quran-text text-2xl text-foreground sm:text-3xl">
              {parts}{ayah.text.slice(cursor)}
              <span className="mx-1.5 inline-block whitespace-nowrap text-[0.8em] text-gold" aria-label={format(t.correction.ayahMarker, { number: ayah.ayahNumber })}>
                ﴿{toArabicNumerals(ayah.ayahNumber)}﴾
              </span>
            </p>
            {correction?.state === "correct" && <p className="flex items-center justify-end gap-1 text-xs text-success"><Check className="size-3.5" aria-hidden />{t.correction.correct}</p>}
            {correction?.state === "needs_review" && <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><CircleHelp className="size-3.5" aria-hidden />{t.correction.needsReview}</p>}
          </div>
        );
      })}
      {safeReport.ayahs.some((ayah) => ayah.issues.length > 0) && (
        <ul aria-label={t.correction.legend} className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
          {categories.map((category) => {
            const Icon = icons[category];
            return <li key={category} className="flex items-center gap-1.5"><span className={cn("rounded-sm p-1", tones[category])}><Icon className="size-3" aria-hidden /></span>{t.correction[category]}</li>;
          })}
        </ul>
      )}
    </div>
  );
}