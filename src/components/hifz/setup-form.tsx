import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIMITS, validateSettings } from "@/lib/exam/range";
import { describeRange } from "@/lib/format";
import { format, useStrings } from "@/lib/i18n";
import { loadRangeAyahs } from "@/lib/quran/service";
import type { QuranMeta, RangeSelection, VersePosition } from "@/lib/quran/types";
import { useSession } from "@/lib/session/session-context";
import type { ExamSettings, RecitationMode } from "@/lib/session/types";
import { NumberStepper } from "./number-stepper";
import { validationMessage } from "./validation-message";

const LAST_SETTINGS_KEY = "hifz-challenge:last-settings:v1";

interface FormState {
  kind: "juz" | "surah";
  startJuz: number;
  endJuz: number;
  start: VersePosition;
  end: VersePosition;
  rounds: number;
  ayahsPerRound: number;
  avoidRepeats: boolean;
  mode: RecitationMode;
}

const DEFAULTS: FormState = {
  kind: "juz",
  startJuz: 1,
  endJuz: 2,
  start: { surah: 2, ayah: 1 },
  end: { surah: 2, ayah: 141 },
  rounds: LIMITS.rounds.default,
  ayahsPerRound: LIMITS.ayahsPerRound.default,
  avoidRepeats: true,
  mode: "continuous",
};

function toRange(s: FormState): RangeSelection {
  return s.kind === "juz"
    ? { kind: "juz", startJuz: s.startJuz, endJuz: s.endJuz }
    : { kind: "surah", start: s.start, end: s.end };
}

export function SetupForm({ meta }: { meta: QuranMeta }) {
  const t = useStrings();
  const navigate = useNavigate();
  const { startSession } = useSession();
  const [form, setForm] = useState<FormState>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_SETTINGS_KEY);
      if (raw) setForm({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<FormState>) });
    } catch {
      /* ignore corrupt settings */
    }
  }, []);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const range = toRange(form);
  const validation = useMemo(
    () => validateSettings({ range, rounds: form.rounds, ayahsPerRound: form.ayahsPerRound }, meta),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(form), meta],
  );
  const willRepeat =
    validation.ok && form.avoidRepeats && validation.distinctStarts < form.rounds;

  const start = useMutation({
    mutationFn: async () => {
      const settings: ExamSettings = {
        range,
        rounds: form.rounds,
        ayahsPerRound: form.ayahsPerRound,
        avoidRepeats: form.avoidRepeats,
        mode: form.mode,
      };
      const ayahs = await loadRangeAyahs(range, meta);
      return { settings, ayahs };
    },
    onSuccess: ({ settings, ayahs }) => {
      window.localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify(form));
      startSession(settings, ayahs, describeRange(settings.range, meta));
      navigate({ to: "/exam" });
    },
  });

  const surahItems = meta.surahs.map((s) => (
    <SelectItem key={s.number} value={String(s.number)}>
      <span className="tabular-nums text-muted-foreground">{s.number}.</span> {s.nameEnglish}
      <span lang="ar" className="ms-2 font-arabic text-muted-foreground">
        {s.nameArabic.replace(/^سُورَةُ\s*/, "")}
      </span>
    </SelectItem>
  ));

  const juzItems = meta.juzStarts.map((j) => (
    <SelectItem key={j.juz} value={String(j.juz)}>
      Juz {j.juz}
      <span className="ms-2 text-xs text-muted-foreground">
        from {meta.surahs[j.surah - 1]?.nameEnglish} {j.surah}:{j.ayah}
      </span>
    </SelectItem>
  ));

  const sectionCls = "rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7";
  const sectionTitle = "font-display text-2xl font-semibold text-primary-deep";

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      onSubmit={(e) => {
        e.preventDefault();
        if (validation.ok && !start.isPending) start.mutate();
      }}
    >
      <div className="grid gap-6">
        <section className={sectionCls} aria-labelledby="range-title">
          <h2 id="range-title" className={sectionTitle}>
            {t.setup.rangeTitle}
          </h2>
          <Tabs value={form.kind} onValueChange={(v) => update({ kind: v as FormState["kind"] })} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
              <TabsTrigger value="juz">{t.setup.byJuz}</TabsTrigger>
              <TabsTrigger value="surah">{t.setup.bySurah}</TabsTrigger>
            </TabsList>
          </Tabs>

          {form.kind === "juz" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="start-juz">{t.setup.fromJuz}</Label>
                <Select value={String(form.startJuz)} onValueChange={(v) => update({ startJuz: Number(v) })}>
                  <SelectTrigger id="start-juz" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{juzItems}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-juz">{t.setup.toJuz}</Label>
                <Select value={String(form.endJuz)} onValueChange={(v) => update({ endJuz: Number(v) })}>
                  <SelectTrigger id="end-juz" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{juzItems}</SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">{t.setup.juzExact}</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              {(["start", "end"] as const).map((which) => {
                const pos = form[which];
                const max = meta.surahs[pos.surah - 1]?.ayahCount ?? 1;
                return (
                  <div key={which} className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                    <div className="grid gap-2">
                      <Label htmlFor={`${which}-surah`}>
                        {which === "start" ? t.setup.fromSurah : t.setup.toSurah}
                      </Label>
                      <Select
                        value={String(pos.surah)}
                        onValueChange={(v) => {
                          const surah = Number(v);
                          const count = meta.surahs[surah - 1]?.ayahCount ?? 1;
                          update({ [which]: { surah, ayah: which === "start" ? 1 : count } });
                        }}
                      >
                        <SelectTrigger id={`${which}-surah`} className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">{surahItems}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${which}-ayah`}>
                        {t.setup.ayahNumber} <span className="text-muted-foreground">(1–{max})</span>
                      </Label>
                      <Input
                        id={`${which}-ayah`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={max}
                        className="h-11 tabular-nums"
                        value={Number.isFinite(pos.ayah) ? pos.ayah : ""}
                        onChange={(e) =>
                          update({
                            [which]: { ...pos, ayah: e.target.value === "" ? NaN : Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={sectionCls} aria-labelledby="exam-title">
          <h2 id="exam-title" className={sectionTitle}>
            {t.setup.examTitle}
          </h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="rounds">{t.setup.rounds}</Label>
              <NumberStepper
                id="rounds"
                label={t.setup.rounds}
                value={form.rounds}
                min={LIMITS.rounds.min}
                max={LIMITS.rounds.max}
                onChange={(rounds) => update({ rounds })}
                describedBy="rounds-hint"
              />
              <p id="rounds-hint" className="text-xs text-muted-foreground">
                {t.setup.roundsHint}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ayahs-per-round">{t.setup.ayahsPerRound}</Label>
              <NumberStepper
                id="ayahs-per-round"
                label={t.setup.ayahsPerRound}
                value={form.ayahsPerRound}
                min={LIMITS.ayahsPerRound.min}
                max={LIMITS.ayahsPerRound.max}
                onChange={(ayahsPerRound) => update({ ayahsPerRound })}
                describedBy="apr-hint"
              />
              <p id="apr-hint" className="text-xs text-muted-foreground">
                {t.setup.ayahsPerRoundHint}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start justify-between gap-4 rounded-xl bg-muted p-4">
            <div>
              <Label htmlFor="avoid-repeats" className="text-sm font-medium">
                {t.setup.avoidRepeats}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">{t.setup.avoidRepeatsHint}</p>
            </div>
            <Switch
              id="avoid-repeats"
              checked={form.avoidRepeats}
              onCheckedChange={(avoidRepeats) => update({ avoidRepeats })}
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">{t.setup.modeTitle}</legend>
            <RadioGroup
              value={form.mode}
              onValueChange={(v) => update({ mode: v as RecitationMode })}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              {(
                [
                  ["continuous", t.setup.modeContinuous, t.setup.modeContinuousHint],
                  ["prompt-only", t.setup.modePromptOnly, t.setup.modePromptOnlyHint],
                ] as const
              ).map(([value, label, hint]) => (
                <Label
                  key={value}
                  htmlFor={`mode-${value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                >
                  <RadioGroupItem id={`mode-${value}`} value={value} className="mt-0.5" />
                  <span className="grid gap-1">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground shadow-elevated">
          <div className="pointer-events-none absolute inset-0 bg-geometric opacity-60" aria-hidden="true" />
          <div className="relative">
            <h2 className="font-display text-2xl font-semibold">{t.setup.summaryTitle}</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-primary-foreground/70">{t.setup.summaryRange}</dt>
                <dd className="mt-0.5 font-display text-xl">{validation.available > 0 ? describeRange(range, meta) : "—"}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-primary-foreground/70">{t.setup.summaryAvailable}</dt>
                  <dd className="mt-0.5 font-display text-3xl tabular-nums">{validation.available || "—"}</dd>
                </div>
                <div>
                  <dt className="text-primary-foreground/70">{t.setup.summaryTotal}</dt>
                  <dd className="mt-0.5 font-display text-3xl tabular-nums text-gold">
                    {Number.isFinite(form.rounds * form.ayahsPerRound) ? form.rounds * form.ayahsPerRound : "—"}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-primary-foreground/70">
                {Number.isFinite(form.rounds) ? form.rounds : "—"} × {Number.isFinite(form.ayahsPerRound) ? form.ayahsPerRound : "—"}{" "}
                {t.common.ayahs} · {t.setup.summaryStarts}: {validation.distinctStarts || "—"}
              </p>
            </dl>

            {validation.issues.length > 0 && (
              <ul className="mt-5 grid gap-2 rounded-xl bg-card p-3 text-sm text-destructive" role="alert">
                {validation.issues.map((issue, i) => (
                  <li key={i} className="flex gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {validationMessage(issue, t)}
                  </li>
                ))}
              </ul>
            )}
            {willRepeat && (
              <p className="mt-5 rounded-xl bg-gold-soft p-3 text-xs text-gold-foreground">
                {format(t.setup.repeatsWarning, { starts: validation.distinctStarts })}
              </p>
            )}
            {start.isError && (
              <p className="mt-5 rounded-xl bg-card p-3 text-sm text-destructive" role="alert">
                {start.error instanceof Error ? start.error.message : String(start.error)}
              </p>
            )}

            <Button type="submit" variant="gold" size="xl" className="mt-6 w-full" disabled={!validation.ok || start.isPending}>
              {start.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> {t.setup.starting}
                </>
              ) : (
                <>
                  {t.setup.start} <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}
