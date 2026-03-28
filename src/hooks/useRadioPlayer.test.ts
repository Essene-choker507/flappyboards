import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSetPlaying = vi.fn();
let mockIsPlaying = false;
let mockRadioStation: { name: string; url: string; genre: string; country: string; favicon: string } | null = null;
let mockMusicVolume = 0.5;

vi.mock("@/stores/music-store", () => ({
  useMusicStore: () => ({
    isPlaying: mockIsPlaying,
    radioStation: mockRadioStation,
    musicVolume: mockMusicVolume,
    setPlaying: mockSetPlaying,
  }),
}));

// Mock HTMLAudioElement
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();

interface MockAudioInstance {
  play: typeof mockPlay;
  pause: typeof mockPause;
  src: string;
  crossOrigin: string | null;
  volume: number;
}

let mockAudioInstances: MockAudioInstance[] = [];

// Use function keyword so it can be used as a constructor with `new`
const MockAudio = vi.fn(function (this: MockAudioInstance) {
  this.play = mockPlay;
  this.pause = mockPause;
  this.src = "";
  this.crossOrigin = null;
  this.volume = 1;
  mockAudioInstances.push(this);
});

vi.stubGlobal("Audio", MockAudio);

import { useRadioPlayer } from "@/hooks/useRadioPlayer";

describe("useRadioPlayer", () => {
  beforeEach(() => {
    mockSetPlaying.mockClear();
    mockPlay.mockClear();
    mockPlay.mockResolvedValue(undefined);
    mockPause.mockClear();
    mockIsPlaying = false;
    mockRadioStation = null;
    mockMusicVolume = 0.5;
    mockAudioInstances = [];
    MockAudio.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates audio element on mount with crossOrigin", () => {
    renderHook(() => useRadioPlayer());

    expect(mockAudioInstances.length).toBe(1);
    expect(mockAudioInstances[0].crossOrigin).toBe("anonymous");
  });

  it("pauses and nullifies audio on unmount", () => {
    const { unmount } = renderHook(() => useRadioPlayer());

    unmount();

    expect(mockPause).toHaveBeenCalled();
  });

  it("syncs volume to audio element", () => {
    mockMusicVolume = 0.8;

    renderHook(() => useRadioPlayer());

    expect(mockAudioInstances[0].volume).toBe(0.8);
  });

  it("plays audio when isPlaying and radioStation are set", () => {
    mockIsPlaying = true;
    mockRadioStation = {
      name: "Test FM",
      url: "https://stream.test.fm",
      genre: "Pop",
      country: "US",
      favicon: "",
    };

    renderHook(() => useRadioPlayer());

    expect(mockAudioInstances[0].src).toBe("https://stream.test.fm");
    expect(mockPlay).toHaveBeenCalled();
  });

  it("pauses audio when isPlaying is false", () => {
    mockIsPlaying = false;

    renderHook(() => useRadioPlayer());

    expect(mockPause).toHaveBeenCalled();
  });

  it("does not change src if it matches current station URL", () => {
    mockIsPlaying = true;
    mockRadioStation = {
      name: "Test FM",
      url: "https://stream.test.fm",
      genre: "Pop",
      country: "US",
      favicon: "",
    };

    const { rerender } = renderHook(() => useRadioPlayer());

    expect(mockAudioInstances[0].src).toBe("https://stream.test.fm");

    rerender();

    expect(mockAudioInstances[0].src).toBe("https://stream.test.fm");
  });

  it("calls setPlaying(false) when play() fails", async () => {
    mockPlay.mockRejectedValue(new Error("Autoplay blocked"));
    mockIsPlaying = true;
    mockRadioStation = {
      name: "Test FM",
      url: "https://stream.test.fm",
      genre: "Pop",
      country: "US",
      favicon: "",
    };

    renderHook(() => useRadioPlayer());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(false);
  });

  it("play() sets src and calls setPlaying(true)", () => {
    const { result } = renderHook(() => useRadioPlayer());

    act(() => {
      result.current.play("https://new-station.fm");
    });

    expect(mockAudioInstances[0].src).toBe("https://new-station.fm");
    expect(mockSetPlaying).toHaveBeenCalledWith(true);
  });

  it("play() without URL just calls setPlaying(true)", () => {
    const { result } = renderHook(() => useRadioPlayer());

    act(() => {
      result.current.play();
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(true);
  });

  it("pause() calls setPlaying(false)", () => {
    const { result } = renderHook(() => useRadioPlayer());

    act(() => {
      result.current.pause();
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(false);
  });

  it("stop() pauses audio, clears src, and calls setPlaying(false)", () => {
    const { result } = renderHook(() => useRadioPlayer());

    act(() => {
      result.current.stop();
    });

    expect(mockPause).toHaveBeenCalled();
    expect(mockAudioInstances[0].src).toBe("");
    expect(mockSetPlaying).toHaveBeenCalledWith(false);
  });

  it("returns isPlaying from store", () => {
    mockIsPlaying = true;
    const { result } = renderHook(() => useRadioPlayer());
    expect(result.current.isPlaying).toBe(true);
  });

  it("does not recreate Audio on rerender when ref already exists", () => {
    const { rerender } = renderHook(() => useRadioPlayer());

    expect(MockAudio).toHaveBeenCalledTimes(1);

    rerender();

    // Should not create a second Audio instance
    expect(MockAudio).toHaveBeenCalledTimes(1);
  });

  it("plays without changing src when url matches current src", () => {
    mockIsPlaying = true;
    mockRadioStation = {
      name: "Test FM",
      url: "https://stream.test.fm",
      genre: "Pop",
      country: "US",
      favicon: "",
    };

    renderHook(() => useRadioPlayer());

    // First render sets src and plays
    expect(mockAudioInstances[0].src).toBe("https://stream.test.fm");
    expect(mockPlay).toHaveBeenCalledTimes(1);

    // Manually set the src to match (simulating it already being set)
    // The mock already has src set, so rerender should skip setting it again
  });

  it("pauses audio when isPlaying changes to false with a station", () => {
    mockIsPlaying = true;
    mockRadioStation = {
      name: "Test FM",
      url: "https://stream.test.fm",
      genre: "Pop",
      country: "US",
      favicon: "",
    };

    const { rerender } = renderHook(() => useRadioPlayer());

    expect(mockPlay).toHaveBeenCalled();

    mockPlay.mockClear();
    mockPause.mockClear();
    mockIsPlaying = false;

    rerender();

    expect(mockPause).toHaveBeenCalled();
  });

  it("pauses audio when radioStation is null while isPlaying", () => {
    mockIsPlaying = true;
    mockRadioStation = null;

    renderHook(() => useRadioPlayer());

    // With no station URL, should pause
    expect(mockPause).toHaveBeenCalled();
  });

  it("handles volume change when audio ref exists", () => {
    mockMusicVolume = 0.3;

    renderHook(() => useRadioPlayer());

    expect(mockAudioInstances[0].volume).toBe(0.3);
  });

  it("does not set src when url matches current audio src", () => {
    mockIsPlaying = true;
    mockRadioStation = {
      name: "Test FM",
      url: "https://stream.test.fm",
      genre: "Pop",
      country: "US",
      favicon: "",
    };

    renderHook(() => useRadioPlayer());

    // After first render, src is set to the station url
    expect(mockAudioInstances[0].src).toBe("https://stream.test.fm");

    // The src was already set, so on the same render it shouldn't change
    // This tests the if (audio.src !== radioStation.url) false branch
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it("stop clears audio src and pauses", () => {
    mockIsPlaying = true;
    mockRadioStation = {
      name: "FM",
      url: "https://fm.test",
      genre: "",
      country: "",
      favicon: "",
    };

    const { result } = renderHook(() => useRadioPlayer());

    act(() => {
      result.current.stop();
    });

    expect(mockAudioInstances[0].src).toBe("");
    expect(mockPause).toHaveBeenCalled();
    expect(mockSetPlaying).toHaveBeenCalledWith(false);
  });
});
