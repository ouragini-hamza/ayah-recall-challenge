import { useSyncExternalStore } from "react";
import { Download, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quranLab, type QuranLabError } from "@/lib/assessment/quranlab";
import { format, useStrings } from "@/lib/i18n";

const serverSnapshot = () => ({ status: "idle" as const });
const serverState = serverSnapshot();

export function QuranLabStatus({ reason }: { reason?: QuranLabError | undefined }) {
  const t = useStrings();
  const state = useSyncExternalStore(quranLab.subscribe, quranLab.snapshot, () => serverState);
  const error = reason ?? (state.status === "error" ? state.reason : null);
  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      <p role="status">{error ? t.quranlab.errors[error] : state.status === "loading" ? t.quranlab.loading : state.status === "ready" ? format(t.quranlab.ready, { version: state.version }) : t.quranlab.download}</p>
      {state.status === "ready" && <p className="text-xs">{state.cached ? t.quranlab.cached : t.quranlab.downloaded}</p>}
      <p className="text-xs">{t.quranlab.local}</p>
      <p className="text-xs">{t.quranlab.setup}</p>
      <a href="https://sdk.quranlab.ai/" target="_blank" rel="noreferrer" className="w-fit text-primary underline underline-offset-4">{t.correction.sdkLink}</a>
      {!reason && state.status !== "ready" && (
        <Button variant="outline" size="sm" className="w-fit" disabled={state.status === "loading"} onClick={() => { void quranLab.load().catch(() => undefined); }}>
          {state.status === "loading" ? <Loader2 className="animate-spin" /> : error ? <RotateCcw /> : <Download />}
          {error ? t.common.retry : t.quranlab.prepare}
        </Button>
      )}
    </div>
  );
}