import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NumberStepperProps {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  describedBy?: string;
}

export function NumberStepper({ id, value, min, max, onChange, label, describedBy }: NumberStepperProps) {
  const safe = Number.isFinite(value) ? value : min;
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-full"
        onClick={() => onChange(Math.max(min, safe - 1))}
        disabled={safe <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus />
      </Button>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="h-11 w-20 text-center font-display text-2xl font-semibold tabular-nums"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-full"
        onClick={() => onChange(Math.min(max, safe + 1))}
        disabled={safe >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus />
      </Button>
    </div>
  );
}
