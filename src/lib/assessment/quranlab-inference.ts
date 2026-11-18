import type { TajweedDecoded, TajweedHeads, TajweedSession } from "@quran-lab/tajweedformer";
import { classifyQuranLabError, quranLab, QuranLabFailure, type QuranLabError } from "./quranlab";

export interface RawObservation {
  text: string;
  tokens: TajweedDecoded["tokens"];
  settled: number;
  isFinal: boolean;
  heads: { name: string; frameMs: number; frames: number; classes: number; sample: number[] }[];
  modelVersion: string;
  referenceAvailable: boolean;
  calibration: { context: string; data: Readonly<Record<string, unknown>> | null } | null;
}

function summarizeHeads(heads: TajweedHeads): RawObservation["heads"] {
  return heads.names.flatMap((name) => {
    const head = heads.get(name);
    return head ? [{ name, frameMs: head.frameMs, frames: head.frames, classes: head.classes, sample: Array.from(head.values.slice(0, 8)) }] : [];
  });
}

let active = false;
/** Decode the ONE existing MediaRecorder recording locally; no second microphone is opened.
 * listen({from: samples}) is the documented own-audio path. No silence cutoff: consume all ayahs.
 */
export async function inferRecording(audio: Blob, signal?: AbortSignal): Promise<RawObservation> {
  if (active) throw new QuranLabFailure("inference");
  active = true;
  let session: TajweedSession | null = null;
  let context: AudioContext | null = null;
  let interrupted = false;
  let cancelTask: Promise<void> | null = null;
  const cancel = () => {
    interrupted = true;
    if (session) cancelTask ??= session.cancel().catch(() => undefined);
  };
  const hidden = () => { if (document.hidden) cancel(); };
  const ensureActive = () => { if (interrupted || signal?.aborted || document.hidden) throw new QuranLabFailure("interrupted"); };
  signal?.addEventListener("abort", cancel);
  document.addEventListener("visibilitychange", hidden);
  try {
    ensureActive();
    const model = await quranLab.load();
    ensureActive();
    await quranLab.disableSharing();
    context = new AudioContext();
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    ensureActive();
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const samples = decoded.getChannelData(channel);
      for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) + (samples[i] ?? 0) / decoded.numberOfChannels;
    }
    await context.close(); context = null;
    session = await model.listen({ from: mono, sampleRate: decoded.sampleRate, pace: "fast", heads: "all" });
    ensureActive();
    let latest: TajweedDecoded | null = null;
    for await (const chunk of session.chunks) { ensureActive(); latest = chunk.decoded; }
    ensureActive();
    const heads = await session.finish();
    ensureActive();
    const result = heads.decoded();
    latest = result ?? latest;
    if (!latest) throw new QuranLabFailure("inference");
    return {
      text: latest.text, tokens: latest.tokens.map((token) => ({ ...token })), settled: latest.settled, isFinal: latest.isFinal,
      heads: summarizeHeads(heads), modelVersion: model.version, referenceAvailable: model.reference !== null,
      calibration: model.calibration ? { context: model.defaultContext, data: model.calibration.context(model.defaultContext) } : null,
    };
  } catch (error) {
    const reason: QuranLabError = interrupted ? "interrupted" : error instanceof QuranLabFailure ? error.reason : classifyQuranLabError(error);
    throw new QuranLabFailure(reason);
  } finally {
    if (session) await session.cancel().catch(() => undefined);
    if (context) await context.close().catch(() => undefined);
    await cancelTask;
    signal?.removeEventListener("abort", cancel);
    document.removeEventListener("visibilitychange", hidden);
    active = false;
  }
}