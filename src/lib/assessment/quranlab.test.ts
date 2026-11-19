import { describe, expect, it, vi } from "vitest";
import type { TajweedModel } from "@quran-lab/tajweedformer";
import { classifyQuranLabError, createQuranLabLoader } from "./quranlab";

function setup(key: string | undefined = "test-fixture-not-a-key", supported = true) {
  const model = { version: "4.0.0", reference: null, calibration: null } as unknown as TajweedModel;
  const setOn = vi.fn().mockResolvedValue(undefined);
  const loadModel = vi.fn().mockResolvedValue(model);
  const create = vi.fn().mockResolvedValue({ model: loadModel, storage: vi.fn().mockResolvedValue({ models: [{ version: "4.0.0" }] }), sharing: { setOn } });
  return { loader: createQuranLabLoader({ key: () => key, supported: () => supported, create }), create, setOn, loadModel, model };
}

describe("Quran Lab loader", () => {
  it("never creates a client without a configured key", async () => {
    const { loader, create } = setup("");
    await expect(loader.load()).rejects.toMatchObject({ reason: "missing_key" });
    expect(loader.snapshot()).toEqual({ status: "error", reason: "missing_key" });
    expect(create).not.toHaveBeenCalled();
  });
  it("reports unsupported environments before importing the SDK", async () => {
    const { loader, create } = setup(undefined, false);
    await expect(loader.load()).rejects.toMatchObject({ reason: "unsupported" });
    expect(create).not.toHaveBeenCalled();
  });
  it("shares concurrent loads and reuses the verified model", async () => {
    const { loader, create, loadModel, model } = setup();
    const states: string[] = [];
    const unsubscribe = loader.subscribe(() => states.push(loader.snapshot().status));
    expect(await Promise.all([loader.load(), loader.load()])).toEqual([model, model]);
    expect(await loader.load()).toBe(model);
    expect(create).toHaveBeenCalledTimes(1);
    expect(loadModel).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["loading", "loading", "ready"]);
    expect(loader.snapshot()).toEqual({ status: "ready", cached: true, version: "4.0.0", reference: false, calibration: false });
    unsubscribe();
  });
  it("disables sharing before opening the model and before further takes", async () => {
    const { loader, setOn, loadModel } = setup();
    await loader.load(); await loader.disableSharing();
    expect(setOn.mock.calls).toEqual([[false], [false]]);
    expect(setOn.mock.invocationCallOrder[0]).toBeLessThan(loadModel.mock.invocationCallOrder[0] ?? 0);
  });

  it("retries a failed model without creating a competing client", async () => {
    const { loader, create, loadModel } = setup();
    loadModel.mockRejectedValueOnce({ code: "download_failed", message: "do not expose configuration" });
    await expect(loader.load()).rejects.toMatchObject({ message: "download" });
    expect(loader.snapshot()).toEqual({ status: "error", reason: "download" });
    await loader.load(); expect(create).toHaveBeenCalledTimes(1);
  });
  it("maps origin rejection and offline errors without echoing SDK messages", () => {
    expect(classifyQuranLabError({ code: "server_rejected" })).toBe("origin_denied");
    expect(classifyQuranLabError({ code: "needs_connection" })).toBe("offline");
    expect(classifyQuranLabError({ code: "storage_failed" })).toBe("storage");
  });
});