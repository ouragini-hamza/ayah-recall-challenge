/** Local session history. Stores settings, results and passage text — never audio. */
import type { ExamSession } from "./types";

const STORAGE_KEY = "hifz-challenge:history:v1";
const MAX_SESSIONS = 100;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadHistory(): ExamSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as ExamSession[]).filter((s) => s && s.version === 1 && Array.isArray(s.rounds));
  } catch {
    return [];
  }
}

function write(sessions: ExamSession[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function saveSessionToHistory(session: ExamSession) {
  const rest = loadHistory().filter((s) => s.id !== session.id);
  write([session, ...rest]);
}

export function getSessionFromHistory(id: string): ExamSession | undefined {
  return loadHistory().find((s) => s.id === id);
}

export function deleteSessionFromHistory(id: string) {
  write(loadHistory().filter((s) => s.id !== id));
}

export function clearHistory() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
