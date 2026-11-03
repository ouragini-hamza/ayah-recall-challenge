import { cn } from "@/lib/utils";

/** Eight-point star (khatam) used as a quiet brand mark and ornament. */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-8", className)}>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="12" y="12" width="24" height="24" />
        <rect x="12" y="12" width="24" height="24" transform="rotate(45 24 24)" />
        <circle cx="24" cy="24" r="5" />
      </g>
    </svg>
  );
}
