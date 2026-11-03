import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RotateCcw, Settings2 } from "lucide-react";

import { SessionReport } from "@/components/hifz/session-report";
import { StarMark } from "@/components/hifz/star-mark";
import { Button } from "@/components/ui/button";
import { useStrings } from "@/lib/i18n";
import { useSession } from "@/lib/session/session-context";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Session results — Hifz Challenge" },
      { name: "description", content: "Review each round's passage and your self-assessment." },
      { property: "og:title", content: "Session results — Hifz Challenge" },
      { property: "og:description", content: "Review each round's passage and your self-assessment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const t = useStrings();
  const navigate = useNavigate();
  const { session, restartSession } = useSession();

  if (!session || session.status !== "completed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <StarMark className="size-12 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-primary-deep">{t.results.noSession}</h1>
        <div className="mt-6 flex gap-3">
          <Button asChild variant="hero">
            <Link to="/">{t.exam.goSetup}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/history">{t.nav.history}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{session.rangeLabel}</p>
        <h1 className="font-display text-4xl font-semibold text-primary-deep sm:text-5xl">{t.results.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.results.savedNote}</p>
      </header>
      <SessionReport session={session} />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="hero"
          size="lg"
          onClick={() => {
            if (restartSession()) navigate({ to: "/exam" });
          }}
        >
          <RotateCcw /> {t.results.restart}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/">
            <Settings2 /> {t.results.newSetup}
          </Link>
        </Button>
      </div>
    </div>
  );
}
