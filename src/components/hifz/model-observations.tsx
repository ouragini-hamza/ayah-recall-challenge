import type { RawObservation } from "@/lib/assessment/quranlab-inference";
import { format, useStrings } from "@/lib/i18n";

export function ModelObservations({ observation }: { observation: RawObservation }) {
  const t = useStrings();
  return (
    <details className="mt-4 border-t border-border pt-3 text-sm">
      <summary className="cursor-pointer font-medium text-primary">{t.quranlab.observations}</summary>
      <div className="mt-3 grid min-w-0 gap-3">
        <p className="text-muted-foreground">{t.quranlab.notCorrections}</p>
        <p className="text-xs text-muted-foreground">{t.quranlab.caution}</p>
        <p dir="ltr" className="break-words rounded-md bg-muted p-3 font-mono">{observation.text || t.quranlab.noTokens}</p>
        <p className="text-xs text-muted-foreground">{format(t.quranlab.decoding, { settled: observation.settled, final: observation.isFinal ? t.quranlab.yes : t.quranlab.no })}</p>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-start text-xs" dir="ltr">
            <thead><tr>{[t.quranlab.token, t.quranlab.start, t.quranlab.peak, t.quranlab.end, t.quranlab.confidence].map((label) => <th key={label} className="p-1 text-start">{label}</th>)}</tr></thead>
            <tbody>{observation.tokens.map((token, i) => <tr key={`${token.id}-${i}`}><td className="p-1 font-mono">{token.name}</td><td>{token.firstMs}</td><td>{token.peakMs}</td><td>{token.lastMs}</td><td>{token.confidence === null ? "—" : token.confidence.toFixed(3)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{observation.referenceAvailable ? t.quranlab.referenceAvailable : t.quranlab.referenceMissing}</p>
        <details><summary className="cursor-pointer">{t.quranlab.heads}</summary>
          <div className="mt-2 grid gap-2">{observation.heads.map((head) => <div key={head.name} className="min-w-0 text-xs"><p className="font-mono">{head.name} · {head.frameMs} ms · {head.frames} × {head.classes}</p><p className="break-all font-mono text-muted-foreground">{head.sample.map((value) => value.toFixed(4)).join(", ")}</p></div>)}</div>
        </details>
        <details><summary className="cursor-pointer">{t.quranlab.calibration}</summary><p className="mt-2 text-xs text-muted-foreground">{t.quranlab.limits}</p><pre dir="ltr" className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{observation.calibration ? JSON.stringify(observation.calibration, null, 2) : t.quranlab.calibrationMissing}</pre></details>
      </div>
    </details>
  );
}