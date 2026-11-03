import type { AssessmentResult } from "@/lib/assessment/adapter";
import type { Ayah, RangeSelection } from "@/lib/quran/types";

export type RecitationMode = "continuous" | "prompt-only";
export type SelfAssessment = "correct" | "minor" | "revise";

export interface ExamSettings {
  range: RangeSelection;
  rounds: number;
  ayahsPerRound: number;
  avoidRepeats: boolean;
  mode: RecitationMode;
}

export interface RoundRecord {
  index: number;
  /** Target passage; hidden in the UI until the round is submitted. */
  ayahs: Ayah[];
  startedAt: number | null;
  finishedAt: number | null;
  recordingMs: number;
  hadRecording: boolean;
  hintUsed: boolean;
  assessment: AssessmentResult | null;
  selfAssessment: SelfAssessment | null;
}

export interface ExamSession {
  id: string;
  version: 1;
  settings: ExamSettings;
  rangeLabel: string;
  startedAt: number;
  finishedAt: number | null;
  currentIndex: number;
  status: "in_progress" | "completed";
  rounds: RoundRecord[];
}
