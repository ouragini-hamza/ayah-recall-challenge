import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "error";

export type RecorderError = "denied" | "unsupported" | "noDevice" | "generic";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** In-memory microphone recorder. Audio is never uploaded or persisted. */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const stopResolverRef = useRef<((b: Blob | null) => void) | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const id = window.setInterval(() => {
      const seg = segmentStartRef.current ? Date.now() - segmentStartRef.current : 0;
      setElapsedMs(accumulatedRef.current + seg);
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearUrl = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAudioUrl(null);
  }, []);

  const reset = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    recorderRef.current = null;
    releaseStream();
    clearUrl();
    chunksRef.current = [];
    blobRef.current = null;
    accumulatedRef.current = 0;
    segmentStartRef.current = null;
    setElapsedMs(0);
    setError(null);
    setErrorMessage("");
    setStatus("idle");
  }, [clearUrl, releaseStream]);

  useEffect(() => () => reset(), [reset]);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      setSupported(false);
      setError("unsupported");
      setStatus("error");
      return;
    }
    reset();
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" })
          : null;
        blobRef.current = blob;
        if (blob) {
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setAudioUrl(url);
        }
        releaseStream();
        setStatus("stopped");
        stopResolverRef.current?.(blob);
        stopResolverRef.current = null;
      };
      rec.start(1000);
      accumulatedRef.current = 0;
      segmentStartRef.current = Date.now();
      setElapsedMs(0);
      setStatus("recording");
    } catch (err) {
      releaseStream();
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setError("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setError("noDevice");
      else {
        setError("generic");
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
      setStatus("error");
    }
  }, [releaseStream, reset]);

  const pause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    if (segmentStartRef.current) accumulatedRef.current += Date.now() - segmentStartRef.current;
    segmentStartRef.current = null;
    setElapsedMs(accumulatedRef.current);
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    segmentStartRef.current = Date.now();
    setStatus("recording");
  }, []);

  /** Stops recording and resolves with the captured audio (or null). */
  const stop = useCallback((): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return Promise.resolve(blobRef.current);
    if (segmentStartRef.current) accumulatedRef.current += Date.now() - segmentStartRef.current;
    segmentStartRef.current = null;
    setElapsedMs(accumulatedRef.current);
    return new Promise((resolve) => {
      stopResolverRef.current = resolve;
      rec.stop();
    });
  }, []);

  return {
    status,
    error,
    errorMessage,
    elapsedMs,
    audioUrl,
    supported,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
