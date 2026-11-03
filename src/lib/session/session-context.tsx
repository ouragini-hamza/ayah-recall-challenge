import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { AssessmentResult } from "@/lib/assessment/adapter";
import { selectPassages } from "@/lib/exam/selection";
import type { Ayah } from "@/lib/quran/types";
import { saveSessionToHistory } from "./history";
import type { ExamSession, ExamSettings, RoundRecord, SelfAssessment } from "./types";

interface SessionContextValue {
  session: ExamSession | null;
  startSession: (settings: ExamSettings, rangeAyahs: Ayah[], rangeLabel: string) => ExamSession;
  restartSession: () => ExamSession | null;
  submitRound: (
    index: number,
    data: { recordingMs: number; hadRecording: boolean; assessment: AssessmentResult },
  ) => void;
  markHintUsed: (index: number) => void;
  rateRound: (index: number, value: SelfAssessment) => void;
  advance: () => void;
  completeSession: () => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

function buildSession(settings: ExamSettings, rangeAyahs: Ayah[], rangeLabel: string): ExamSession {
  const passages = selectPassages(rangeAyahs, {
    ayahsPerRound: settings.ayahsPerRound,
    rounds: settings.rounds,
    avoidRepeats: settings.avoidRepeats,
  });
  const now = Date.now();
  const rounds: RoundRecord[] = passages.map((ayahs, index) => ({
    index,
    ayahs,
    startedAt: index === 0 ? now : null,
    finishedAt: null,
    recordingMs: 0,
    hadRecording: false,
    hintUsed: false,
    assessment: null,
    selfAssessment: null,
  }));
  return {
    id: newId(),
    version: 1,
    settings,
    rangeLabel,
    startedAt: now,
    finishedAt: null,
    currentIndex: 0,
    status: "in_progress",
    rounds,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [rangeCache, setRangeCache] = useState<{ ayahs: Ayah[]; label: string } | null>(null);

  const updateRound = useCallback((index: number, patch: Partial<RoundRecord>) => {
    setSession((s) =>
      s ? { ...s, rounds: s.rounds.map((r) => (r.index === index ? { ...r, ...patch } : r)) } : s,
    );
  }, []);

  const startSession = useCallback<SessionContextValue["startSession"]>(
    (settings, rangeAyahs, rangeLabel) => {
      const next = buildSession(settings, rangeAyahs, rangeLabel);
      setRangeCache({ ayahs: rangeAyahs, label: rangeLabel });
      setSession(next);
      return next;
    },
    [],
  );

  const restartSession = useCallback(() => {
    if (!session || !rangeCache) return null;
    const next = buildSession(session.settings, rangeCache.ayahs, rangeCache.label);
    setSession(next);
    return next;
  }, [rangeCache, session]);

  const submitRound = useCallback<SessionContextValue["submitRound"]>(
    (index, data) => updateRound(index, { ...data, finishedAt: Date.now() }),
    [updateRound],
  );

  const markHintUsed = useCallback((index: number) => updateRound(index, { hintUsed: true }), [updateRound]);

  const rateRound = useCallback(
    (index: number, value: SelfAssessment) => updateRound(index, { selfAssessment: value }),
    [updateRound],
  );

  const advance = useCallback(() => {
    setSession((s) => {
      if (!s) return s;
      const nextIndex = Math.min(s.currentIndex + 1, s.rounds.length - 1);
      return {
        ...s,
        currentIndex: nextIndex,
        rounds: s.rounds.map((r) =>
          r.index === nextIndex && r.startedAt === null ? { ...r, startedAt: Date.now() } : r,
        ),
      };
    });
  }, []);

  const completeSession = useCallback(() => {
    setSession((s) => {
      if (!s) return s;
      // Only rounds that were actually submitted count toward the report.
      const done: ExamSession = {
        ...s,
        status: "completed",
        finishedAt: Date.now(),
        rounds: s.rounds.filter((r) => r.finishedAt !== null),
      };
      saveSessionToHistory(done);
      return done;
    });
  }, []);

  const clearSession = useCallback(() => setSession(null), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      startSession,
      restartSession,
      submitRound,
      markHintUsed,
      rateRound,
      advance,
      completeSession,
      clearSession,
    }),
    [session, startSession, restartSession, submitRound, markHintUsed, rateRound, advance, completeSession, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
