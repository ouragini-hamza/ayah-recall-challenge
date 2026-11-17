import { ArrowRight, CheckCircle2, Eye, Flag, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRecorder } from "@/hooks/use-recorder";
import { getAssessmentProvider } from "@/lib/assessment/adapter";
import { buildPromptExcerpt } from "@/lib/exam/selection";
import { formatDuration, passageReference } from "@/lib/format";
import { useStrings } from "@/lib/i18n";
import type { ExamSession, SelfAssessment } from "@/lib/session/types";
import { useSession } from "@/lib/session/session-context";
import { cn } from "@/lib/utils";
import { PassageText } from "./ayah-text";
import { AssessmentStatus, selfAssessmentTone } from "./assessment-status";
import { RecorderPanel } from "./recorder-panel";

interface RoundViewProps {
  session: ExamSession;
  onFinishSession: () => void;
}

export function RoundView({ session, onFinishSession }: RoundViewProps) {
  const t = useStrings();
  const { submitRound, rateRound, advance, markHintUsed } = useSession();
  const round = session.rounds[session.currentIndex];
  const isLast = session.currentIndex === session.rounds.length - 1;
  const submitted = round?.finishedAt != null;
  const continuous = session.settings.mode === "continuous";
  const recorder = useRecorder();
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (submitted) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [submitted]);

  const first = round?.ayahs[0];
  if (!round || !first) return null;
  const prompt = buildPromptExcerpt(first);
  const roundElapsed =
    round.startedAt && now ? (round.finishedAt ?? now) - round.startedAt : 0;

  const finish = async () => {
    setSubmitting(true);
    try {
      const audio = continuous ? await recorder.stop() : null;
      const provider = getAssessmentProvider();
      const assessment = await provider.assess({ audio, expected: round.ayahs });
      submitRound(round.index, {
        recordingMs: continuous ? recorder.elapsedMs : 0,
        hadRecording: !!audio,
        assessment,
      });
    } catch {
      submitRound(round.index, {
        recordingMs: continuous ? recorder.elapsedMs : 0,
        hadRecording: !!recorder.audioUrl,
        assessment: { status: "error", providerId: getAssessmentProvider().id, message: "Assessment failed" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const options: { value: SelfAssessment; label: string; hint: string }[] = [
    { value: "correct", label: t.assessment.correct, hint: t.assessment.correctHint },
    { value: "minor", label: t.assessment.minor, hint: t.assessment.minorHint },
    { value: "revise", label: t.assessment.revise, hint: t.assessment.reviseHint },
  ];

  return (
    <div className="grid gap-6">
      {/* Prompt */}
      {!submitted && <section
        aria-label={t.exam.beginFrom}
        className="relative overflow-hidden rounded-3xl bg-hero px-6 py-10 text-center text-primary-foreground shadow-elevated sm:px-10 sm:py-14"
      >
        <div className="pointer-events-none absolute inset-0 bg-geometric opacity-50" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">{t.exam.beginFrom}</p>
          <p lang="ar" dir="rtl" className="quran-text mt-6 text-4xl sm:text-5xl md:text-6xl">
            {prompt.words}
            {prompt.truncated && <span className="text-gold"> …</span>}
          </p>
          <p className="mt-8 text-sm text-primary-foreground/75">{t.exam.continueHint}</p>
          {prompt.basmalahOmitted && (
            <p className="mt-1 text-xs text-primary-foreground/60">{t.exam.basmalahNote}</p>
          )}
          <div className="mt-6 flex justify-center">
            {round.hintUsed || submitted ? (
              <p className="rounded-full bg-primary-deep/60 px-4 py-1.5 text-sm">
                <span className="text-gold">{t.exam.hintLabel}:</span> {first.surahNameEnglish}{" "}
                <span lang="ar" className="font-arabic">
                  {first.surahNameArabic}
                </span>
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:bg-primary-deep/50 hover:text-primary-foreground"
                onClick={() => markHintUsed(round.index)}
              >
                <Eye /> {t.exam.showHint}
              </Button>
            )}
          </div>
        </div>
      </section>}

      {!submitted && (
        <>
          {continuous ? (
            <RecorderPanel recorder={recorder} locked={submitting} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-soft">
              {t.setup.modePromptOnlyHint}
            </div>
          )}
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t.exam.roundTime}:{" "}
              <span className="font-display text-lg tabular-nums text-foreground">{formatDuration(roundElapsed)}</span>
            </p>
            <Button
              type="button"
              variant="hero"
              size="lg"
              onClick={finish}
              disabled={submitting || recorder.status === "requesting"}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Flag />}
              {t.exam.finishRound}
            </Button>
          </div>
        </>
      )}

      {submitted && (
        <div className="animate-rise grid gap-6">
          <section className="rounded-2xl border border-gold/40 bg-card p-6 shadow-soft sm:p-8" aria-labelledby="revealed-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="revealed-title" className="font-display text-2xl font-semibold text-primary-deep">
                {t.exam.revealedTitle}
              </h2>
              <span className="text-sm text-muted-foreground">{passageReference(round.ayahs)}</span>
            </div>
            <PassageText ayahs={round.ayahs} corrections={round.assessment?.status === "completed" ? round.assessment.corrections : undefined} className="mt-5" />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <AssessmentStatus result={round.assessment} />
              <span className="text-xs text-muted-foreground">
                {t.exam.roundTime}: {formatDuration(roundElapsed)}
              </span>
            </div>
            {round.assessment?.status === "setup_needed" && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t.correction.setup}{" "}
                <a href="https://sdk.quranlab.ai/docs" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">{t.correction.sdkLink}</a>
              </p>
            )}
            {recorder.audioUrl && (
              <div className="mt-5 grid gap-2">
                <p className="text-sm font-medium">{t.recorder.playback}</p>
                <audio controls src={recorder.audioUrl} className="w-full" />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft" aria-labelledby="rate-title">
            <h2 id="rate-title" className="font-display text-2xl font-semibold text-primary-deep">
              {t.exam.rateTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.exam.rateHint}</p>
            <div role="radiogroup" aria-labelledby="rate-title" className="mt-4 grid gap-3 sm:grid-cols-3">
              {options.map((o) => {
                const selected = round.selfAssessment === o.value;
                return (
                  <Button
                    key={o.value}
                    type="button"
                    variant="outline"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => rateRound(round.index, o.value)}
                    className={cn(
                      "h-auto flex-col items-start gap-1 whitespace-normal rounded-xl border p-4 text-start transition-all",
                      selected ? cn(selfAssessmentTone[o.value], "shadow-soft") : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {selected && <CheckCircle2 className="size-4" aria-hidden="true" />}
                      {o.label}
                    </span>
                    <span className="text-xs opacity-80">{o.hint}</span>
                  </Button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              {!round.selfAssessment && <p className="text-xs text-muted-foreground">{t.exam.rateRequired}</p>}
              <Button
                type="button"
                variant="hero"
                size="lg"
                disabled={!round.selfAssessment}
                onClick={() => (isLast ? onFinishSession() : advance())}
              >
                {isLast ? t.exam.seeResults : t.exam.nextRound} <ArrowRight />
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
