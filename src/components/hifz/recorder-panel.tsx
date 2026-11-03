import { Mic, Pause, Play, RotateCcw, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { useRecorder } from "@/hooks/use-recorder";
import { formatDuration } from "@/lib/format";
import { format, useStrings } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Recorder = ReturnType<typeof useRecorder>;

export function RecorderPanel({ recorder, locked }: { recorder: Recorder; locked: boolean }) {
  const t = useStrings();
  const { status, error, elapsedMs, audioUrl, supported } = recorder;
  const active = status === "recording" || status === "paused";

  const statusLabel =
    status === "error" ? null : !supported ? t.recorder.unsupported : t.recorder[status];

  const errorText =
    status === "error" && error
      ? error === "generic"
        ? format(t.recorder.genericError, { message: recorder.errorMessage })
        : t.recorder[error]
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4">
          {!active ? (
            <Button
              type="button"
              variant="record"
              size="orb"
              onClick={() => recorder.start()}
              disabled={locked || !supported || status === "requesting"}
              aria-label={status === "stopped" ? t.recorder.rerecord : t.recorder.start}
            >
              {status === "stopped" ? <RotateCcw /> : <Mic />}
            </Button>
          ) : (
            <Button
              type="button"
              variant="record"
              size="orb"
              className={cn(status === "recording" && "animate-pulse-ring")}
              onClick={() => recorder.stop()}
              aria-label={t.recorder.stop}
            >
              <Square className="fill-current" />
            </Button>
          )}
          <div>
            <p className="flex items-center gap-2 text-sm font-medium" aria-live="polite">
              {status === "recording" && <span className="size-2 rounded-full bg-recording animate-pulse" aria-hidden="true" />}
              {statusLabel}
            </p>
            <p className="font-display text-4xl tabular-nums text-primary-deep" aria-label="Recording time">
              {formatDuration(elapsedMs)}
            </p>
          </div>
        </div>
        {active && (
          <Button
            type="button"
            variant="outline"
            onClick={() => (status === "recording" ? recorder.pause() : recorder.resume())}
          >
            {status === "recording" ? <Pause /> : <Play />}
            {status === "recording" ? t.recorder.pause : t.recorder.resume}
          </Button>
        )}
      </div>

      {errorText && (
        <p className="mt-4 rounded-xl bg-destructive-soft p-3 text-sm text-destructive" role="alert">
          {errorText}
        </p>
      )}
      {!supported && status !== "error" && (
        <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t.recorder.unsupported}</p>
      )}

      {audioUrl && status === "stopped" && (
        <div className="mt-5 grid gap-2">
          <p className="text-sm font-medium">{t.recorder.playback}</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t.recorder.localOnly}</p>
    </div>
  );
}
