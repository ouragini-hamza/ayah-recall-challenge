import { Eye, Mic } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDuration, passageReference } from "@/lib/format";
import { useStrings } from "@/lib/i18n";
import type { ExamSession, SelfAssessment } from "@/lib/session/types";
import { cn } from "@/lib/utils";
import { PassageText } from "./ayah-text";
import { AssessmentStatus, SelfAssessmentBadge } from "./assessment-status";

const BAR: Record<SelfAssessment, string> = {
  correct: "bg-success",
  minor: "bg-warning",
  revise: "bg-destructive",
};

export function SessionReport({ session }: { session: ExamSession }) {
  const t = useStrings();
  const rounds = session.rounds;
  const totalAyahs = rounds.reduce((n, r) => n + r.ayahs.length, 0);
  const duration = (session.finishedAt ?? session.startedAt) - session.startedAt;
  const counts: Record<SelfAssessment, number> = { correct: 0, minor: 0, revise: 0 };
  rounds.forEach((r) => {
    if (r.selfAssessment) counts[r.selfAssessment] += 1;
  });

  const stats = [
    { label: t.results.rounds, value: `${rounds.length} / ${session.settings.rounds}` },
    { label: t.results.totalAyahs, value: String(totalAyahs) },
    { label: t.results.duration, value: formatDuration(duration) },
  ];

  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <dt className="text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-primary-deep sm:text-4xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="breakdown-title">
        <h2 id="breakdown-title" className="font-display text-xl font-semibold text-primary-deep">
          {t.results.breakdown}
        </h2>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {(Object.keys(counts) as SelfAssessment[]).map((k) =>
            counts[k] > 0 ? (
              <div key={k} className={BAR[k]} style={{ width: `${(counts[k] / Math.max(1, rounds.length)) * 100}%` }} />
            ) : null,
          )}
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 text-sm">
          {(Object.keys(counts) as SelfAssessment[]).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", BAR[k])} aria-hidden="true" />
              <span className="text-muted-foreground">{t.assessment[k]}</span>
              <span className="font-semibold tabular-nums">{counts[k]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="review-title">
        <h2 id="review-title" className="mb-3 font-display text-2xl font-semibold text-primary-deep">
          {t.results.review}
        </h2>
        <Accordion type="multiple" className="grid gap-3">
          {rounds.map((r) => (
            <AccordionItem
              key={r.index}
              value={String(r.index)}
              className="rounded-2xl border border-border bg-card px-5 shadow-soft last:border-b"
            >
              <AccordionTrigger className="gap-3 py-4 hover:no-underline">
                <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-start">
                  <span className="font-display text-lg font-semibold">
                    {t.common.round} {r.index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{passageReference(r.ayahs)}</span>
                  <SelfAssessmentBadge value={r.selfAssessment} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <PassageText ayahs={r.ayahs} />
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <AssessmentStatus result={r.assessment} />
                  {r.hadRecording && (
                    <span className="inline-flex items-center gap-1">
                      <Mic className="size-3.5" aria-hidden="true" /> {t.results.recorded} · {formatDuration(r.recordingMs)}
                    </span>
                  )}
                  {r.hintUsed && (
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" aria-hidden="true" /> {t.results.hintUsed}
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
