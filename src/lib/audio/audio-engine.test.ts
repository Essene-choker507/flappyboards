import { describe, it, expect, vi, beforeEach } from "vitest";

// We need fresh module imports per test because audioEngine is a singleton.
// The AudioContext mock must be a function (not arrow) so `new` works.

// Shared holders for mock objects that the factory captures
let mockGainNode: {
  gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
};
let mockCtx: Record<string, unknown>;
let createdSources: Array<{
  buffer: unknown;
  playbackRate: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}>;

function installAudioContextMock(overrides?: { createBufferSourceThrows?: boolean }) {
  createdSources = [];
  mockGainNode = {
    gain: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
  };

  vi.stubGlobal("AudioContext", function (this: Record<string, unknown>) {
    this.sampleRate = 44100;
    this.currentTime = 0.5;
    this.destination = {};
    this.createGain = vi.fn(() => mockGainNode);
    this.createBuffer = vi.fn((_channels: number, length: number, _rate: number) => ({
      getChannelData: vi.fn(() => new Float32Array(length)),
    }));
    this.createBufferSource = vi.fn(() => {
      if (overrides?.createBufferSourceThrows) {
        throw new Error("Cannot create buffer source");
      }
      const src = {
        buffer: null as unknown,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        start: vi.fn(),
        onended: null as (() => void) | null,
      };
      createdSources.push(src);
      return src;
    });
    mockCtx = this;
    return this;
  });
}

describe("audio-engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    installAudioContextMock();
    vi.spyOn(performance, "now").mockReturnValue(1000);
    vi.spyOn(Math, "random").mockReturnValue(0.1); // Below PLAY_PROBABILITY (0.35)
  });

  async function getEngine() {
    const mod = await import("@/lib/audio/audio-engine");
    return mod.audioEngine;
  }

  describe("initialize", () => {
    it("creates AudioContext, gain node, and buffers", async () => {
      const engine = await getEngine();
      expect(engine.initialized).toBe(false);
      await engine.initialize();
      expect(engine.initialized).toBe(true);
    });

    it("does not re-initialize if already initialized", async () => {
      const engine = await getEngine();
      await engine.initialize();
      const prevCtx = mockCtx;
      await engine.initialize(); // second call - should be a no-op
      expect(engine.initialized).toBe(true);
      // mockCtx should still point to the same object (no new AudioContext created)
      expect(mockCtx).toBe(prevCtx);
    });

    it("sets gain to volume when not muted", async () => {
      const engine = await getEngine();
      await engine.initialize();
      expect(mockGainNode.gain.value).toBe(0.5);
      expect(engine.volume).toBe(0.5);
      expect(engine.muted).toBe(false);
    });

    it("sets gain to 0 when muted during initialization", async () => {
      const engine = await getEngine();
      engine.setMuted(true);
      await engine.initialize();
      expect(mockGainNode.gain.value).toBe(0);
    });

    it("handles AudioContext construction failure gracefully", async () => {
      vi.stubGlobal("AudioContext", function () {
        throw new Error("AudioContext not supported");
      });
      vi.resetModules();

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const engine = await getEngine();
      await engine.initialize();

      expect(engine.initialized).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        "Audio initialization failed:",
        expect.any(Error)
      );
    });
  });

  describe("currentTime", () => {
    it("returns 0 when not initialized", async () => {
      const engine = await getEngine();
      expect(engine.currentTime).toBe(0);
    });

    it("returns AudioContext.currentTime when initialized", async () => {
      const engine = await getEngine();
      await engine.initialize();
      expect(engine.currentTime).toBe(0.5);
    });
  });

  describe("playClack", () => {
    it("returns false when not initialized (no ctx)", async () => {
      const engine = await getEngine();
      expect(engine.playClack()).toBe(false);
    });

    it("returns false when muted", async () => {
      const engine = await getEngine();
      await engine.initialize();
      engine.setMuted(true);
      expect(engine.playClack()).toBe(false);
    });

    it("returns false when throttled (called too quickly)", async () => {
      const engine = await getEngine();
      await engine.initialize();

      vi.spyOn(performance, "now").mockReturnValue(1000);
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      engine.playClack(0);

      // Within MIN_INTERVAL_MS (30ms)
      vi.spyOn(performance, "now").mockReturnValue(1010);
      expect(engine.playClack()).toBe(false);
    });

    it("returns false when at max concurrent sounds", async () => {
      const engine = await getEngine();
      await engine.initialize();

      // Play 4 sounds (MAX_CONCURRENT = 4)
      for (let i = 0; i < 4; i++) {
        vi.spyOn(performance, "now").mockReturnValue(1000 + i * 100);
        vi.spyOn(Math, "random").mockReturnValue(0.1);
        engine.playClack(i);
      }

      vi.spyOn(performance, "now").mockReturnValue(1500);
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      expect(engine.playClack()).toBe(false);
    });

    it("returns false when probabilistic skip (random > PLAY_PROBABILITY)", async () => {
      const engine = await getEngine();
      await engine.initialize();

      vi.spyOn(Math, "random").mockReturnValue(0.9); // > 0.35
      expect(engine.playClack()).toBe(false);
    });

    it("plays sound successfully with explicit variation and returns true", async () => {
      const engine = await getEngine();
      await engine.initialize();

      vi.spyOn(performance, "now").mockReturnValue(1000);
      vi.spyOn(Math, "random").mockReturnValue(0.1);

      const result = engine.playClack(2);
      expect(result).toBe(true);

      // A source was created and started
      const playSources = createdSources.slice(-1);
      expect(playSources[0].connect).toHaveBeenCalledWith(mockGainNode);
      expect(playSources[0].start).toHaveBeenCalled();
    });

    it("picks random buffer when no variation provided", async () => {
      const engine = await getEngine();
      await engine.initialize();

      vi.spyOn(performance, "now").mockReturnValue(1000);
      let callCount = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0.1;  // pass probability check
        if (callCount === 2) return 0.5;  // buffer index: floor(0.5 * 4) = 2
        return 0.5; // playback rate
      });

      const result = engine.playClack(); // no variation
      expect(result).toBe(true);
    });

    it("decrements activeCount via onended handler", async () => {
      const engine = await getEngine();
      await engine.initialize();

      // Fill to max concurrent
      for (let i = 0; i < 4; i++) {
        vi.spyOn(performance, "now").mockReturnValue(1000 + i * 100);
        vi.spyOn(Math, "random").mockReturnValue(0.1);
        engine.playClack(i);
      }

      // Confirm blocked
      vi.spyOn(performance, "now").mockReturnValue(1500);
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      expect(engine.playClack()).toBe(false);

      // End one source
      const playSource = createdSources[createdSources.length - 1];
      playSource.onended!();

      // Now should succeed
      vi.spyOn(performance, "now").mockReturnValue(1600);
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      expect(engine.playClack(0)).toBe(true);
    });

    it("onended does not let activeCount go below 0", async () => {
      const engine = await getEngine();
      await engine.initialize();

      vi.spyOn(performance, "now").mockReturnValue(1000);
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      engine.playClack(0);

      const src = createdSources[createdSources.length - 1];
      // Call onended multiple times
      src.onended!();
      src.onended!();

      // Engine still works
      vi.spyOn(performance, "now").mockReturnValue(2000);
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      expect(engine.playClack(0)).toBe(true);
    });

    it("returns false when createBufferSource throws", async () => {
      installAudioContextMock({ createBufferSourceThrows: true });
      vi.resetModules();

      // Need to re-spy after resetModules
      vi.spyOn(performance, "now").mockReturnValue(1000);
      vi.spyOn(Math, "random").mockReturnValue(0.1);

      const engine = await getEngine();
      await engine.initialize();

      const result = engine.playClack(0);
      expect(result).toBe(false);
    });
  });

  describe("scheduleClack", () => {
    it("does nothing when not initialized", async () => {
      const engine = await getEngine();
      engine.scheduleClack(1.0, 0);
      // No error, no sources created for playback
    });

    it("does nothing when muted", async () => {
      const engine = await getEngine();
      await engine.initialize();
      engine.setMuted(true);
      const countBefore = createdSources.length;
      engine.scheduleClack(1.0, 0);
      expect(createdSources.length).toBe(countBefore);
    });

    it("schedules a clack at a future time", async () => {
      const engine = await getEngine();
      await engine.initialize();
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const countBefore = createdSources.length;
      engine.scheduleClack(2.0, 1);
      expect(createdSources.length).toBe(countBefore + 1);

      const src = createdSources[createdSources.length - 1];
      expect(src.start).toHaveBeenCalledWith(2.0); // 2.0 > currentTime 0.5
    });

    it("uses Math.max to clamp when to currentTime", async () => {
      const engine = await getEngine();
      await engine.initialize();
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      engine.scheduleClack(0.1, 0); // 0.1 < currentTime 0.5
      const src = createdSources[createdSources.length - 1];
      expect(src.start).toHaveBeenCalledWith(0.5); // max(0.1, 0.5) = 0.5
    });

    it("uses default variation of 0 when not provided", async () => {
      const engine = await getEngine();
      await engine.initialize();
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      engine.scheduleClack(1.0);
      const src = createdSources[createdSources.length - 1];
      expect(src.start).toHaveBeenCalled();
    });

    it("respects concurrency limit of MAX_CONCURRENT * 2", async () => {
      const engine = await getEngine();
      await engine.initialize();
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const countBefore = createdSources.length;

      // Schedule 8 sounds (MAX_CONCURRENT * 2 = 8)
      for (let i = 0; i < 8; i++) {
        engine.scheduleClack(1.0 + i * 0.1, i % 4);
      }
      expect(createdSources.length).toBe(countBefore + 8);

      // 9th should be silently ignored
      engine.scheduleClack(2.0, 0);
      expect(createdSources.length).toBe(countBefore + 8);
    });

    it("decrements activeCount when scheduled source ends", async () => {
      const engine = await getEngine();
      await engine.initialize();
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      engine.scheduleClack(1.0, 0);
      const src = createdSources[createdSources.length - 1];
      expect(src.onended).toBeInstanceOf(Function);
      src.onended!();
      // No error means activeCount decremented successfully
    });

    it("handles exception in createBufferSource gracefully", async () => {
      installAudioContextMock({ createBufferSourceThrows: true });
      vi.resetModules();

      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const engine = await getEngine();
      await engine.initialize();

      // Should not throw
      engine.scheduleClack(1.0, 0);
    });
  });

  describe("setVolume", () => {
    it("updates gain via setTargetAtTime when initialized and not muted", async () => {
      const engine = await getEngine();
      await engine.initialize();

      engine.setVolume(0.8);
      expect(engine.volume).toBe(0.8);
      expect(mockGainNode.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 0.5, 0.01);
    });

    it("clamps volume below 0 to 0", async () => {
      const engine = await getEngine();
      await engine.initialize();

      engine.setVolume(-0.5);
      expect(engine.volume).toBe(0);
    });

    it("clamps volume above 1 to 1", async () => {
      const engine = await getEngine();
      await engine.initialize();

      engine.setVolume(1.5);
      expect(engine.volume).toBe(1);
    });

    it("only sets internal value when not initialized (no gainNode)", async () => {
      const engine = await getEngine();
      engine.setVolume(0.7);
      expect(engine.volume).toBe(0.7);
    });

    it("does not call setTargetAtTime when muted", async () => {
      const engine = await getEngine();
      await engine.initialize();

      engine.setMuted(true);
      mockGainNode.gain.setTargetAtTime.mockClear();

      engine.setVolume(0.9);
      expect(engine.volume).toBe(0.9);
      expect(mockGainNode.gain.setTargetAtTime).not.toHaveBeenCalled();
    });
  });

  describe("setMuted", () => {
    it("sets gain to 0 when muted", async () => {
      const engine = await getEngine();
      await engine.initialize();

      engine.setMuted(true);
      expect(engine.muted).toBe(true);
      expect(mockGainNode.gain.setTargetAtTime).toHaveBeenCalledWith(0, 0.5, 0.01);
    });

    it("restores gain to volume when unmuted", async () => {
      const engine = await getEngine();
      await engine.initialize();

      engine.setMuted(true);
      engine.setMuted(false);
      expect(engine.muted).toBe(false);
      expect(mockGainNode.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 0.5, 0.01);
    });

    it("does nothing to gain when no gainNode (not initialized)", async () => {
      const engine = await getEngine();
      engine.setMuted(true);
      expect(engine.muted).toBe(true);
      // No error thrown
    });
  });

  describe("volume getter", () => {
    it("returns the default volume", async () => {
      const engine = await getEngine();
      expect(engine.volume).toBe(0.5);
    });
  });

  describe("muted getter", () => {
    it("returns the default muted state", async () => {
      const engine = await getEngine();
      expect(engine.muted).toBe(false);
    });
  });

  describe("generateClack (tested indirectly through initialize)", () => {
    it("creates 4 buffers with correct sample lengths", async () => {
      const engine = await getEngine();

      vi.spyOn(Math, "random").mockReturnValue(0.5);
      await engine.initialize();

      const createBufferFn = (mockCtx as { createBuffer: ReturnType<typeof vi.fn> }).createBuffer;
      expect(createBufferFn).toHaveBeenCalledTimes(4);

      // duration=0.025 -> length = floor(44100 * 0.025) = 1102
      expect(createBufferFn).toHaveBeenNthCalledWith(1, 1, 1102, 44100);
      // duration=0.030 -> length = floor(44100 * 0.030) = 1323
      expect(createBufferFn).toHaveBeenNthCalledWith(2, 1, 1323, 44100);
      // duration=0.020 -> length = floor(44100 * 0.020) = 882
      expect(createBufferFn).toHaveBeenNthCalledWith(3, 1, 882, 44100);
      // duration=0.035 -> length = floor(44100 * 0.035) = 1543
      expect(createBufferFn).toHaveBeenNthCalledWith(4, 1, 1543, 44100);
    });
  });
});
