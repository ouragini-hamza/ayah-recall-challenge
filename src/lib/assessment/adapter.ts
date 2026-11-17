/**
 * Recitation assessment adapter.
 *
 * No Quran-aware speech recognition provider is connected in this MVP. The
 * default provider never transcribes or scores anything; it only reports that
 * assessment is unavailable so the UI can fall back to manual self-assessment.
 *
 * To integrate a real provider later, implement `RecitationAssessmentProvider`
 * (ideally calling it from a server function so keys stay private) and return
 * it from `getAssessmentProvider()`.
 */
import type { Ayah } from "@/lib/quran/types";
import type { PassageCorrections } from "./corrections";

export interface WordMistake {
  ayahKey: string;
  wordIndex: number;
  expected: string;
  heard?: string;
  kind: "missed" | "substituted" | "added" | "repeated";
}

export type AssessmentResult =
  | { status: "not_connected"; providerId: string }
  | { status: "no_recording"; providerId: string }
  | { status: "setup_needed"; providerId: string }
  | {
      status: "completed";
      providerId: string;
      transcript: string;
      mistakes: WordMistake[];
      /** 0..1 as reported by the provider; never computed locally. */
      accuracy?: number;
      corrections?: PassageCorrections;
    }
  | { status: "error"; providerId: string; message: string };

export interface AssessmentInput {
  audio: Blob | null;
  expected: Ayah[];
}

export interface RecitationAssessmentProvider {
  id: string;
  label: string;
  isConfigured: boolean;
  assess(input: AssessmentInput): Promise<AssessmentResult>;
}

export const notConnectedProvider: RecitationAssessmentProvider = {
  id: "none",
  label: "No assessment provider",
  isConfigured: false,
  async assess({ audio }) {
    return audio
      ? { status: "not_connected", providerId: "none" }
      : { status: "no_recording", providerId: "none" };
  },
};

export function getAssessmentProvider(): RecitationAssessmentProvider {
  return tajweedFormerSetupProvider;
}

/** Honest placeholder, NOT an SDK integration. No audio leaves this tab. */
export const tajweedFormerSetupProvider: RecitationAssessmentProvider = {
  id: "tajweedformer-v4",
  label: "TajweedFormer V4 (setup required)",
  isConfigured: false,
  async assess({ audio }) {
    return audio
      ? { status: "setup_needed", providerId: "tajweedformer-v4" }
      : { status: "no_recording", providerId: "tajweedformer-v4" };
  },
};
