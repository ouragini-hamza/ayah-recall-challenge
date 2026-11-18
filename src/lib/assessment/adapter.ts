/**
 * Recitation assessment adapter.
 *
 * Local SDK observations are not assessments. Only reliable aligned evidence
 * may enter the completed correction contract. Manual self-assessment stays available.
 */
import type { Ayah } from "@/lib/quran/types";
import type { PassageCorrections } from "./corrections";
import { hasQuranLabKey, QuranLabFailure, type QuranLabError } from "./quranlab";
import { inferRecording, type RawObservation } from "./quranlab-inference";

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
  | { status: "observed"; providerId: string; observation: RawObservation }
  | {
      status: "completed";
      providerId: string;
      transcript: string;
      mistakes: WordMistake[];
      /** 0..1 as reported by the provider; never computed locally. */
      accuracy?: number;
      corrections?: PassageCorrections;
    }
  | { status: "error"; providerId: string; message: string; reason?: QuranLabError };

export interface AssessmentInput {
  audio: Blob | null;
  expected: Ayah[];
  signal?: AbortSignal;
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
  return tajweedFormerProvider;
}

/** Real SDK inference; intentionally does not populate the completed correction contract. */
export const tajweedFormerProvider: RecitationAssessmentProvider = {
  id: "tajweedformer-v4",
  label: "TajweedFormer V4",
  get isConfigured() { return hasQuranLabKey(); },
  async assess({ audio, signal }) {
    const providerId = "tajweedformer-v4";
    if (!audio) return { status: "no_recording", providerId };
    if (!hasQuranLabKey()) return { status: "setup_needed", providerId };
    try { return { status: "observed", providerId, observation: await inferRecording(audio, signal) }; }
    catch (error) {
      const reason = error instanceof QuranLabFailure ? error.reason : "inference";
      return { status: "error", providerId, message: reason, reason };
    }
  },
};
