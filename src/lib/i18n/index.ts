import { en, type UiStrings } from "./en";

export type Locale = "en";

const dictionaries: Record<Locale, UiStrings> = { en };

/** Active UI strings. Swap the locale here (or via context) once more languages exist. */
export function useStrings(locale: Locale = "en"): UiStrings {
  return dictionaries[locale];
}

export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export type { UiStrings };
