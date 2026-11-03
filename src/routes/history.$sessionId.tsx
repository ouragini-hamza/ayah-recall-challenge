import { createFileRoute, Link } from "@tanstack/react-router";
import { format as formatDate } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { SessionReport } from "@/components/hifz/session-report";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStrings } from "@/lib/i18n";
import { getSessionFromHistory } from "@/lib/session/history";
import type { ExamSession } from "@/lib/session/types";

export const Route = createFileRoute("/history/$sessionId")({
  head: () => ({
    meta: [
      { title: "Past session — Hifz Challenge" },
      { name: "description", content: "Review a past memorization session saved on this device." },
      { property: "og:title", content: "Past session — Hifz Challenge" },
      { property: "og:description", content: "Review a past memorization session saved on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryDetailPage,
});

function HistoryDetailPage() {
  const t = useStrings();
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<ExamSession | null | undefined>(undefined);

  useEffect(() => {
    setSession(getSessionFromHistory(sessionId) ?? null);
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ms-2">
        <Link to="/history">
          <ArrowLeft /> {t.nav.history}
        </Link>
      </Button>
      {session === undefined ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : session === null ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">{t.history.notFound}</p>
      ) : (
        <>
          <header className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {formatDate(session.startedAt, "PPPp")}
            </p>
            <h1 className="font-display text-4xl font-semibold text-primary-deep">{session.rangeLabel}</h1>
          </header>
          <SessionReport session={session} />
        </>
      )}
    </div>
  );
}
