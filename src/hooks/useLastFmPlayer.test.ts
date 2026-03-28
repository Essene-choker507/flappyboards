import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the music store
const mockSetPlaying = vi.fn();
const mockSetCurrentTrack = vi.fn();
let mockSource = "lastfm";
let mockLastfmUsername: string | null = "testuser";

vi.mock("@/stores/music-store", () => ({
  useMusicStore: () => ({
    source: mockSource,
    lastfmUsername: mockLastfmUsername,
    setPlaying: mockSetPlaying,
    setCurrentTrack: mockSetCurrentTrack,
  }),
}));

import { useLastFmPlayer } from "@/hooks/useLastFmPlayer";

describe("useLastFmPlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSource = "lastfm";
    mockLastfmUsername = "testuser";
    mockSetPlaying.mockClear();
    mockSetCurrentTrack.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            isPlaying: true,
            track: { title: "Song", artist: "Artist" },
          }),
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls immediately when source is lastfm and username is set", async () => {
    renderHook(() => useLastFmPlayer());

    // flush the immediate poll() call
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledWith("/api/lastfm/now-playing?user=testuser");
    expect(mockSetPlaying).toHaveBeenCalledWith(true);
    expect(mockSetCurrentTrack).toHaveBeenCalledWith({
      title: "Song",
      artist: "Artist",
    });
  });

  it("polls on interval every 10 seconds", async () => {
    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("sets currentTrack to null when track is not present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isPlaying: false, track: null }),
      })
    );

    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(false);
    expect(mockSetCurrentTrack).toHaveBeenCalledWith(null);
  });

  it("does not poll when source is not lastfm", async () => {
    mockSource = "radio";

    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not poll when lastfmUsername is null", async () => {
    mockLastfmUsername = null;

    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles non-ok response gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false })
    );

    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockSetPlaying).not.toHaveBeenCalled();
    expect(mockSetCurrentTrack).not.toHaveBeenCalled();
  });

  it("handles fetch error gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should not throw, just silently ignore
    expect(mockSetPlaying).not.toHaveBeenCalled();
  });

  it("clears interval on unmount", async () => {
    const { unmount } = renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    // No additional calls after unmount
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears interval when source changes away from lastfm", async () => {
    const { rerender } = renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Change source to radio
    mockSource = "radio";
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    // No additional calls after source changed
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("encodes lastfmUsername in the URL", async () => {
    mockLastfmUsername = "user name";

    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/lastfm/now-playing?user=user%20name"
    );
  });

  it("does not poll if activeRef is false (username cleared mid-poll)", async () => {
    // Start active
    renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Now set username to null -- useEffect will deactivate
    mockLastfmUsername = null;
    // This triggers the "no lastfmUsername" early return in useEffect
  });

  it("clears existing interval when source changes to non-lastfm", async () => {
    // Start with active polling
    const { rerender } = renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Verify the interval was created by advancing 10s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    // Now switch source to "off" - this triggers the early-return path
    // which should clear the interval (lines 41-43)
    mockSource = "off";
    rerender();

    // Advance time - should NOT poll again
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("clears existing interval when username becomes null", async () => {
    const { rerender } = renderHook(() => useLastFmPlayer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Switch username to null
    mockLastfmUsername = null;
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    // No additional polls
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
