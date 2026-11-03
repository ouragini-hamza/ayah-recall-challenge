import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Lock, Sparkles } from "lucide-react";

import { StarMark } from "@/components/hifz/star-mark";
import { format, useStrings } from "@/lib/i18n";
import { QURAN_SOURCE } from "@/lib/quran/service";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & data sources — Hifz Challenge" },
      {
        name: "description",
        content: "How Hifz Challenge works, its privacy approach, and the source of its Quran text.",
      },
      { property: "og:title", content: "About Hifz Challenge" },
      { property: "og:description", content: "How the examination works, privacy, and Quran text sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = useStrings();
  const [before, after] = t.about.sourcesBody.split("{source}");
  const [mid, end] = (after ?? "").split("{edition}");
  const sections = [
    { icon: Sparkles, title: t.about.aiTitle, body: <p>{t.about.aiBody}</p> },
    { icon: Lock, title: t.about.privacyTitle, body: <p>{t.about.privacyBody}</p> },
    {
      icon: BookOpen,
      title: t.about.sourcesTitle,
      body: (
        <>
          <p>
            {before}
            <a href={QURAN_SOURCE.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              {QURAN_SOURCE.name}
            </a>
            {mid}
            <a href={QURAN_SOURCE.tanzilUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              {QURAN_SOURCE.editionLabel}
            </a>
            {end}
          </p>
          <p className="mt-3">{t.about.promptNote}</p>
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <StarMark className="size-12 text-gold" />
      <h1 className="mt-4 font-display text-4xl font-semibold text-primary-deep sm:text-5xl">{t.about.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t.about.intro}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t.app.disclaimer}</p>
      <div className="mt-10 grid gap-4">
        {sections.map(({ icon: Icon, title, body }) => (
          <section key={title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="flex items-center gap-3 font-display text-2xl font-semibold text-primary-deep">
              <Icon className="size-5 text-gold" aria-hidden="true" /> {title}
            </h2>
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</div>
          </section>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">{format("Version {v}", { v: "0.1 (MVP)" })}</p>
    </div>
  );
}
