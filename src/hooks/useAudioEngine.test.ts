import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { mockInitialize } = vi.hoisted(() => ({
  mockInitialize: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audio/audio-engine", () => ({
  audioEngine: {
    initialize: mockInitialize,
  },
}));

import { useAudioEngine } from "@/hooks/useAudioEngine";

describe("useAudioEngine", () => {
  beforeEach(() => {
    mockInitialize.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns isReady false initially", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.isReady).toBe(false);
    expect(result.current.audioEngine).toBeDefined();
  });

  it("initializes audio on click event", async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      document.dispatchEvent(new Event("click"));
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(true);
  });

  it("initializes audio on touchstart event", async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      document.dispatchEvent(new Event("touchstart"));
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(true);
  });

  it("initializes audio on keydown event", async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      document.dispatchEvent(new Event("keydown"));
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(true);
  });

  it("only initializes once even with multiple events", async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      document.dispatchEvent(new Event("click"));
    });

    await act(async () => {
      document.dispatchEvent(new Event("keydown"));
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(true);
  });

  it("removes event listeners on unmount", async () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useAudioEngine());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("returns the audioEngine instance", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.audioEngine).toEqual({ initialize: mockInitialize });
  });
});
