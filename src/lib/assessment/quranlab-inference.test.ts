import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ load: vi.fn(), sharing: vi.fn() }));
vi.mock("./quranlab", async (original) => ({ ...await original<typeof import("./quranlab")>(), quranLab: { load: mocks.load, disableSharing: mocks.sharing } }));
import { inferRecording } from "./quranlab-inference";

describe("Local recording inference lifecycle", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("passes the whole existing recording to listen, preserves raw outputs, and cancels cleanly", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    class FakeAudioContext {
      decodeAudioData = vi.fn().mockResolvedValue({ length: 2, sampleRate: 48000, numberOfChannels: 2, getChannelData: (channel: number) => new Float32Array(channel ? [0.4, 0.2] : [0.2, 0.4]) });
      close = close;
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const decoded = { text: "fixture-phones", tokens: [{ id: 1, name: "a", firstMs: 0, peakMs: 20, lastMs: 40, confidence: 0.8 }], settled: 1, isFinal: true };
    const heads = { names: ["conf"], get: () => ({ frameMs: 20, frames: 1, classes: 1, values: new Float32Array([0.8]) }), decoded: () => decoded };
    const cancel = vi.fn().mockResolvedValue(undefined);
    const finish = vi.fn().mockResolvedValue(heads);
    const listen = vi.fn().mockResolvedValue({ chunks: (async function* () { yield { decoded }; })(), finish, cancel });
    mocks.load.mockResolvedValue({ listen, version: "fixture", reference: null, calibration: null });
    const audio = { arrayBuffer: async () => new ArrayBuffer(8) } as Blob;
    const result = await inferRecording(audio);
    expect(listen.mock.calls[0]?.[0]).toMatchObject({ sampleRate: 48000, pace: "fast", heads: "all" });
    expect(listen.mock.calls[0]?.[0].endOnSilenceMs).toBeUndefined();
    expect(Array.from(listen.mock.calls[0]?.[0].from ?? [])).toEqual([expect.closeTo(0.3), expect.closeTo(0.3)]);
    expect(result.text).toBe("fixture-phones");
    expect(result.tokens[0]?.confidence).toBe(0.8);
    expect(result.referenceAvailable).toBe(false);
    expect(result).not.toHaveProperty("corrections");
    expect(result).not.toHaveProperty("accuracy");
    expect(cancel).toHaveBeenCalled(); expect(close).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
  it("does not begin inference after cancellation", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(inferRecording(new Blob(), controller.signal)).rejects.toMatchObject({ reason: "interrupted" });
    expect(mocks.load).not.toHaveBeenCalled();
  });
});