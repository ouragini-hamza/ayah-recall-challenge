import { CircleCheck, CircleDashed, MicOff, TriangleAlert } from "lucide-react";

import type { AssessmentResult } from "@/lib/assessment/adapter";
import { format, useStrings } from "@/lib/i18n";
import type { SelfAssessment } from "@/lib/session/types";
import { cn } from "@/lib/utils";

export function AssessmentStatus({ result }: { result: AssessmentResult | null }) {
  const t = useStrings();
  if (!result) return null;
  const Icon =
    result.status === "not_connected" || result.status === "setup_needed"
      ? CircleDashed
      : result.status === "no_recording"
        ? MicOff
        : result.status === "error"
          ? TriangleAlert
          : CircleCheck;
  const label =
    result.status === "completed"
      ? format(t.assessment.completed, { provider: result.providerId })
      : t.assessment[result.status];
  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-medium text-gold-foreground"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </p>
  );
}

const SELF_STYLES: Record<SelfAssessment, string> = {
  correct: "bg-success-soft text-success border-success/30",
  minor: "bg-warning-soft text-warning border-warning/30",
  revise: "bg-destructive-soft text-destructive border-destructive/30",
};

export function SelfAssessmentBadge({ value }: { value: SelfAssessment | null }) {
  const t = useStrings();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        value ? SELF_STYLES[value] : "border-border bg-muted text-muted-foreground",
      )}
    >
      {value ? t.assessment[value] : t.assessment.unrated}
    </span>
  );
}

export const selfAssessmentTone = SELF_STYLES;
