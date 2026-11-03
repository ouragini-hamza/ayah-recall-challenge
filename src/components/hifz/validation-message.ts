import type { ValidationIssue } from "@/lib/exam/range";
import { format, type UiStrings } from "@/lib/i18n";

export function validationMessage(issue: ValidationIssue, t: UiStrings): string {
  switch (issue.code) {
    case "ayahOutOfBounds":
      return format(t.validation.ayahOutOfBounds, { which: issue.which, max: issue.max });
    case "rangeTooShort":
      return format(t.validation.rangeTooShort, { available: issue.available, needed: issue.needed });
    default:
      return t.validation[issue.code];
  }
}
