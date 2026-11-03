import { createFileRoute, Link } from "@tanstack/react-router";
import { format as formatDate } from "date-fns";
import { ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { SelfAssessmentBadge } from "@/components/hifz/assessment-status";
import { StarMark } from "@/components/hifz/star-mark";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/format";
import { useStrings } from "@/lib/i18n";
import { clearHistory, deleteSessionFromHistory, loadHistory } from "@/lib/session/history";
import type { ExamSession, SelfAssessment } from "@/lib/session/types";

export const Route = createFileRoute("/history/")({
  head: () => ({
    meta: [
      { title: "Session history — Hifz Challenge" },
      { name: "description", content: "Review your past Quran memorization examinations, saved on this device." },
      { property: "og:title", content: "Session history — Hifz Challenge" },
      { property: "og:description", content: "Review your past Quran memorization examinations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function ConfirmDelete({ title, body, onConfirm, trigger }: { title: string; body: string; onConfirm: () => void; trigger: ReactNode }) {
  const t = useStrings();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t.common.delete}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function HistoryPage() {
  const t = useStrings();
  const [sessions, setSessions] = useState<ExamSession[] | null>(null);

  useEffect(() => {
    setSessions(loadHistory());
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary-deep sm:text-5xl">{t.history.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.history.body}</p>
        </div>
        {sessions && sessions.length > 0 && (
          <ConfirmDelete
            title={t.history.clearConfirmTitle}
            body={t.history.clearConfirmBody}
            onConfirm={() => {
              clearHistory();
              setSessions([]);
            }}
            trigger={
              <Button variant="outline" size="sm">
                <Trash2 /> {t.history.clear}
              </Button>
            }
          />
        )}
      </header>

      {sessions === null ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <StarMark className="size-10 text-gold" />
          <p className="mt-4 font-display text-2xl text-primary-deep">{t.history.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.history.emptyBody}</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/">{t.exam.goSetup}</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {sessions.map((s) => {
            const counts: Record<SelfAssessment, number> = { correct: 0, minor: 0, revise: 0 };
            s.rounds.forEach((r) => r.selfAssessment && (counts[r.selfAssessment] += 1));
            return (
              <li key={s.id} className="flex items-stretch gap-2 rounded-2xl border border-border bg-card shadow-soft">
                <Link
                  to="/history/$sessionId"
                  params={{ sessionId: s.id }}
                  className="flex flex-1 items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
                >
                  <div className="flex-1">
                    <p className="font-display text-xl font-semibold text-primary-deep">{s.rangeLabel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(s.startedAt, "PPp")} · {s.rounds.length} {t.common.round.toLowerCase()}s ×{" "}
                      {s.settings.ayahsPerRound} {t.common.ayahs} ·{" "}
                      {formatDuration((s.finishedAt ?? s.startedAt) - s.startedAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(Object.keys(counts) as SelfAssessment[])
                        .filter((k) => counts[k] > 0)
                        .map((k) => (
                          <span key={k} className="inline-flex items-center gap-1">
                            <SelfAssessmentBadge value={k} />
                            <span className="text-xs tabular-nums text-muted-foreground">×{counts[k]}</span>
                          </span>
                        ))}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">{t.history.view}</span>
                </Link>
                <div className="flex items-center pe-3">
                  <ConfirmDelete
                    title={t.history.deleteConfirmTitle}
                    body={t.history.deleteConfirmBody}
                    onConfirm={() => {
                      deleteSessionFromHistory(s.id);
                      setSessions(loadHistory());
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`${t.common.delete} ${s.rangeLabel}`}>
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
