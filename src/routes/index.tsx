import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Info, RefreshCw } from "lucide-react";

import { SetupForm } from "@/components/hifz/setup-form";
import { StarMark } from "@/components/hifz/star-mark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStrings } from "@/lib/i18n";
import { quranMetaQuery } from "@/lib/quran/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hifz Challenge — Quran memorization self-examination" },
      {
        name: "description",
        content:
          "Test your Quran memorization: pick a Juz or Surah range, get a random ayah's opening words and recite from memory.",
      },
      { property: "og:title", content: "Hifz Challenge — اختبار الحفظ" },
      {
        property: "og:description",
        content: "Random-start Quran memorization tests with recording, review and self-assessment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const t = useStrings();
  const meta = useQuery(quranMetaQuery);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <section className="animate-rise grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-end">
        <div>
          <p lang="ar" dir="rtl" className="font-arabic text-2xl text-gold md:text-start">
            وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold leading-[1.05] text-primary-deep sm:text-6xl">
            {t.setup.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">{t.setup.heroBody}</p>
        </div>
        <details className="group rounded-2xl border border-border bg-card p-5 shadow-soft open:shadow-elevated">
          <summary className="flex cursor-pointer list-none items-center gap-3 font-medium text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <StarMark className="size-6 text-gold" />
            {t.setup.howTitle}
          </summary>
          <ol className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {t.setup.howSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display text-lg leading-5 text-gold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 flex gap-2 rounded-xl bg-gold-soft p-3 text-xs text-gold-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t.setup.aiNote}
          </p>
        </details>
      </section>

      <div className="ornament-divider my-10" aria-hidden="true">
        <StarMark className="size-5" />
      </div>

      {meta.isPending ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]" aria-busy="true" aria-label={t.common.loading}>
          <div className="grid gap-6">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : meta.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive-soft p-8 text-center" role="alert">
          <p className="font-display text-2xl text-destructive">{t.setup.metaError}</p>
          <p className="mt-2 text-sm text-muted-foreground">{meta.error.message}</p>
          <Button className="mt-5" onClick={() => meta.refetch()}>
            <RefreshCw /> {t.common.retry}
          </Button>
        </div>
      ) : (
        <SetupForm meta={meta.data} />
      )}
    </div>
  );
}
