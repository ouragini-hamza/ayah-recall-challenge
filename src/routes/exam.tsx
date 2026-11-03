import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { RoundView } from "@/components/hifz/round-view";
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
import { Progress } from "@/components/ui/progress";
import { format, useStrings } from "@/lib/i18n";
import { useSession } from "@/lib/session/session-context";

export const Route = createFileRoute("/exam")({
  head: () => ({
    meta: [
      { title: "Examination — Hifz Challenge" },
      { name: "description", content: "Recite from memory, starting from a random ayah's opening words." },
      { property: "og:title", content: "Examination — Hifz Challenge" },
      { property: "og:description", content: "Recite from memory, starting from a random ayah's opening words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamPage,
});

function ExamPage() {
  const t = useStrings();
  const navigate = useNavigate();
  const { session, completeSession, clearSession } = useSession();

  useEffect(() => {
    if (session?.status === "completed") navigate({ to: "/results" });
  }, [navigate, session?.status]);

  if (!session || session.status !== "in_progress") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <StarMark className="size-12 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-primary-deep">{t.exam.noSession}</h1>
        <p className="mt-2 text-muted-foreground">{t.exam.noSessionBody}</p>
        <Button asChild variant="hero" className="mt-6">
          <Link to="/">{t.exam.goSetup}</Link>
        </Button>
      </div>
    );
  }

  const total = session.rounds.length;
  const done = session.rounds.filter((r) => r.finishedAt !== null).length;
  const { ayahsPerRound } = session.settings;
  const anySubmitted = done > 0;

  const finishSession = () => {
    completeSession();
    navigate({ to: "/results" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{session.rangeLabel}</p>
            <h1 className="font-display text-3xl font-semibold text-primary-deep">
              {t.common.round} {session.currentIndex + 1}{" "}
              <span className="text-muted-foreground">
                {t.common.of} {total}
              </span>
            </h1>
          </div>
          <p className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            {format(t.exam.target, {
              count: ayahsPerRound,
              unit: ayahsPerRound === 1 ? t.common.ayah : t.common.ayahs,
            })}
          </p>
        </div>
        <Progress value={(done / total) * 100} aria-label={`${done} of ${total} rounds completed`} className="h-1.5" />
      </div>

      <RoundView key={session.currentIndex} session={session} onFinishSession={finishSession} />

      <div className="mt-10 flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="link" className="text-muted-foreground">
              {t.exam.endSession}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.exam.endSession}?</AlertDialogTitle>
              <AlertDialogDescription>
                {anySubmitted
                  ? "Submitted rounds will be saved to your history; the rest are discarded."
                  : "No rounds have been submitted, so nothing will be saved."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (anySubmitted) finishSession();
                  else {
                    clearSession();
                    navigate({ to: "/" });
                  }
                }}
              >
                {t.exam.endSession}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
