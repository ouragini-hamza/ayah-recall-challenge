/**
 * On-device Quran speech-to-text (Whisper fine-tuned on recitation, ONNX, via transformers.js).
 * Audio never leaves the browser; only the model files are downloaded, once, then cached.
 */
import { QuranLabFailure } from "./quranlab";

const DEFAULT_MODEL = "iqbalaesthetic/Basira";
const SAMPLE_RATE = 16000;

interface AsrPipeline {
  (
    audio: Float32Array,
    options: Record<string, unknown>,
  ): Promise<{ text: string } | Array<{ text: string }>>;
}

let loading: Promise<AsrPipeline> | null = null;
let active = false;

export function asrModelId(): string {
  return (import.meta.env["VITE_QURAN_ASR_MODEL"] as string | undefined)?.trim() || DEFAULT_MODEL;
}

async function loadPipeline(): Promise<AsrPipeline> {
  loading ??= (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    // WASM + int8 (`*_quantized`) runs on every device; WebGPU can be tried later for speed.
    const build = pipeline as unknown as (
      task: string,
      model: string,
      options: Record<string, unknown>,
    ) => Promise<unknown>;
    return (await build("automatic-speech-recognition", asrModelId(), {
      device: "wasm",
      dtype: "q8",
    })) as AsrPipeline;
  })().catch((error) => {
    loading = null; // allow a retry after a failed download
    throw error;
  });
  return loading;
}

async function decodeToMono16k(audio: Blob): Promise<Float32Array> {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const samples = decoded.getChannelData(channel);
      for (let i = 0; i < mono.length; i++)
        mono[i] = (mono[i] ?? 0) + (samples[i] ?? 0) / decoded.numberOfChannels;
    }
    return mono;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function transcribeRecording(audio: Blob, signal?: AbortSignal): Promise<string> {
  if (active) throw new QuranLabFailure("inference");
  active = true;
  try {
    const ensureActive = () => {
      if (signal?.aborted) throw new QuranLabFailure("interrupted");
    };
    ensureActive();
    const asr = await loadPipeline();
    ensureActive();
    const samples = await decodeToMono16k(audio);
    ensureActive();
    const out = await asr(samples, {
      language: "arabic",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    ensureActive();
    return (Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text).trim();
  } finally {
    active = false;
  }
}
