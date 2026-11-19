import type { TajweedClient, TajweedModel } from "@quran-lab/tajweedformer";

export type QuranLabError = "missing_key" | "origin_denied" | "offline" | "unsupported" | "download" | "storage" | "interrupted" | "inference";
export type QuranLabState =
  | { status: "idle" }
  | { status: "loading"; cached: boolean | null }
  | { status: "ready"; cached: boolean; version: string; reference: boolean; calibration: boolean }
  | { status: "error"; reason: QuranLabError };

export function classifyQuranLabError(error: unknown): QuranLabError {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  if (code === "invalid_key" || code === "server_rejected") return "origin_denied";
  if (code === "needs_connection" || code === "network_not_permitted") return "offline";
  if (code === "runtime_unsupported") return "unsupported";
  if (code === "download_failed" || code === "model_missing" || code === "model_unavailable") return "download";
  if (code === "storage_full" || code === "storage_failed") return "storage";
  if (code === "cancelled" || code === "interrupted") return "interrupted";
  return "inference";
}

export class QuranLabFailure extends Error {
  constructor(readonly reason: QuranLabError) { super(reason); }
}

type Client = Pick<TajweedClient, "model" | "storage" | "sharing">;
interface LoaderOptions {
  key: () => string | undefined;
  supported: () => boolean;
  create: (key: string) => Promise<Client>;
}

/** Dependency-injected for state tests; a single instance is shared by the browser app. */
export function createQuranLabLoader(options: LoaderOptions) {
  let state: QuranLabState = { status: "idle" };
  let client: Client | null = null;
  let model: TajweedModel | null = null;
  let pending: Promise<TajweedModel> | null = null;
  const listeners = new Set<() => void>();
  const update = (next: QuranLabState) => { state = next; listeners.forEach((listener) => listener()); };
  async function initialize(): Promise<TajweedModel> {
    const key = options.key()?.trim();
    if (!key) { update({ status: "error", reason: "missing_key" }); throw new QuranLabFailure("missing_key"); }
    if (!options.supported()) { update({ status: "error", reason: "unsupported" }); throw new QuranLabFailure("unsupported"); }
    update({ status: "loading", cached: null });
    try {
      client ??= await options.create(key);
      // Explicitly override any previous SDK sharing consent BEFORE opening a take.
      await client.sharing.setOn(false);
      const storage = await client.storage();
      const cached = storage.models.length > 0;
      update({ status: "loading", cached });
      model = await client.model();
      update({ status: "ready", cached, version: model.version, reference: model.reference !== null, calibration: model.calibration !== null });
      return model;
    } catch (error) {
      const reason = error instanceof QuranLabFailure ? error.reason : classifyQuranLabError(error);
      update({ status: "error", reason });
      throw new QuranLabFailure(reason); // Never expose SDK messages that might contain configuration.
    }
  }
  return {
    snapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load: () => {
      if (model) return Promise.resolve(model);
      pending ??= initialize().finally(() => { pending = null; });
      return pending;
    },
    disableSharing: async () => { if (client) await client.sharing.setOn(false); },
  };
}

export function hasQuranLabKey() { return Boolean(import.meta.env['VITE_QURANLAB_KEY']?.trim()); }

export const quranLab = createQuranLabLoader({
  key: () => import.meta.env['VITE_QURANLAB_KEY'],
  supported: () => typeof window !== "undefined" && window.isSecureContext &&
    typeof WebAssembly !== "undefined" && typeof Worker !== "undefined" && typeof AudioContext !== "undefined",
  create: async (key) => {
    // Browser-only package entry is loaded only from user actions, never during SSR.
    const { TajweedClient } = await import("@quran-lab/tajweedformer");
    return TajweedClient.create({ key, analytics: "off" });
  },
});