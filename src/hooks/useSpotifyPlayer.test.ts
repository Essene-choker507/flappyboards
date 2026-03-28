import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSetPlaying = vi.fn();
const mockSetCurrentTrack = vi.fn();
let mockSource = "spotify";
let mockIsPlaying = false;
let mockMusicVolume = 0.5;

vi.mock("@/stores/music-store", () => ({
  useMusicStore: () => ({
    source: mockSource,
    isPlaying: mockIsPlaying,
    musicVolume: mockMusicVolume,
    setPlaying: mockSetPlaying,
    setCurrentTrack: mockSetCurrentTrack,
  }),
}));

const mockIsAuthenticated = vi.fn().mockReturnValue(true);
const mockGetValidToken = vi.fn().mockResolvedValue("test-token");

vi.mock("@/lib/music/spotify-auth", () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  getValidToken: () => mockGetValidToken(),
}));

import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";

describe("useSpotifyPlayer", () => {
  let mockPlayer: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
    togglePlay: ReturnType<typeof vi.fn>;
    nextTrack: ReturnType<typeof vi.fn>;
    previousTrack: ReturnType<typeof vi.fn>;
    setVolume: ReturnType<typeof vi.fn>;
    getCurrentState: ReturnType<typeof vi.fn>;
  };

  let listeners: Record<string, (state: unknown) => void>;

  beforeEach(() => {
    mockSetPlaying.mockClear();
    mockSetCurrentTrack.mockClear();
    mockIsAuthenticated.mockReturnValue(true);
    mockGetValidToken.mockResolvedValue("test-token");
    mockSource = "spotify";
    mockIsPlaying = false;
    mockMusicVolume = 0.5;
    listeners = {};

    mockPlayer = {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn(),
      addListener: vi.fn((event: string, cb: (state: unknown) => void) => {
        listeners[event] = cb;
      }),
      removeListener: vi.fn(),
      togglePlay: vi.fn().mockResolvedValue(undefined),
      nextTrack: vi.fn().mockResolvedValue(undefined),
      previousTrack: vi.fn().mockResolvedValue(undefined),
      setVolume: vi.fn().mockResolvedValue(undefined),
      getCurrentState: vi.fn().mockResolvedValue(null),
    };

    // Use function keyword so it works as a constructor with `new`
    const MockSpotifyPlayer = vi.fn(function () {
      return mockPlayer;
    });

    Object.defineProperty(window, "Spotify", {
      writable: true,
      configurable: true,
      value: {
        Player: MockSpotifyPlayer,
      },
    });

    // Remove any existing spotify script tags
    document.querySelectorAll('script[src*="spotify-player"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('script[src*="spotify-player"]').forEach((el) => el.remove());
  });

  it("loads SDK script when source is spotify and authenticated", () => {
    renderHook(() => useSpotifyPlayer());

    const scripts = document.querySelectorAll('script[src*="spotify-player"]');
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).src).toContain(
      "https://sdk.scdn.co/spotify-player.js"
    );
    expect((scripts[0] as HTMLScriptElement).async).toBe(true);
  });

  it("does not load SDK when source is not spotify", () => {
    mockSource = "radio";

    renderHook(() => useSpotifyPlayer());

    const scripts = document.querySelectorAll('script[src*="spotify-player"]');
    expect(scripts.length).toBe(0);
  });

  it("does not load SDK when not authenticated", () => {
    mockIsAuthenticated.mockReturnValue(false);

    renderHook(() => useSpotifyPlayer());

    const scripts = document.querySelectorAll('script[src*="spotify-player"]');
    expect(scripts.length).toBe(0);
  });

  it("does not load SDK if script already exists", () => {
    const existing = document.createElement("script");
    existing.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(existing);

    renderHook(() => useSpotifyPlayer());

    const scripts = document.querySelectorAll('script[src*="spotify-player"]');
    expect(scripts.length).toBe(1);
  });

  it("initializes player when window.Spotify is available", () => {
    renderHook(() => useSpotifyPlayer());

    expect(window.Spotify.Player).toHaveBeenCalledWith({
      name: "FlappyBoards",
      getOAuthToken: expect.any(Function),
      volume: 0.5,
    });
    expect(mockPlayer.connect).toHaveBeenCalled();
    expect(mockPlayer.addListener).toHaveBeenCalledWith(
      "ready",
      expect.any(Function)
    );
    expect(mockPlayer.addListener).toHaveBeenCalledWith(
      "not_ready",
      expect.any(Function)
    );
    expect(mockPlayer.addListener).toHaveBeenCalledWith(
      "player_state_changed",
      expect.any(Function)
    );
  });

  it("sets onSpotifyWebPlaybackSDKReady when window.Spotify is not defined", () => {
    Object.defineProperty(window, "Spotify", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    renderHook(() => useSpotifyPlayer());

    expect(window.onSpotifyWebPlaybackSDKReady).toBeDefined();

    // Now simulate the SDK loading by restoring Spotify and calling the callback
    const MockSpotifyPlayer = vi.fn(function () {
      return mockPlayer;
    });

    Object.defineProperty(window, "Spotify", {
      writable: true,
      configurable: true,
      value: {
        Player: MockSpotifyPlayer,
      },
    });

    act(() => {
      window.onSpotifyWebPlaybackSDKReady();
    });

    expect(mockPlayer.connect).toHaveBeenCalled();
  });

  it("does not init player when source is not spotify", () => {
    mockSource = "radio";

    renderHook(() => useSpotifyPlayer());

    expect(window.Spotify.Player).not.toHaveBeenCalled();
  });

  it("does not init player when not authenticated", () => {
    mockIsAuthenticated.mockReturnValue(false);

    renderHook(() => useSpotifyPlayer());

    expect(window.Spotify.Player).not.toHaveBeenCalled();
  });

  it("handles ready event", () => {
    const { result } = renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["ready"]?.({ device_id: "device-123" });
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.deviceId).toBe("device-123");
  });

  it("handles not_ready event", () => {
    const { result } = renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["ready"]?.({ device_id: "device-123" });
    });

    expect(result.current.isReady).toBe(true);

    act(() => {
      listeners["not_ready"]?.({});
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.deviceId).toBeNull();
  });

  it("handles player_state_changed with track info", () => {
    renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["player_state_changed"]?.({
        paused: false,
        track_window: {
          current_track: {
            name: "Test Song",
            artists: [{ name: "Artist 1" }, { name: "Artist 2" }],
            album: { name: "Test Album" },
          },
        },
      });
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(true);
    expect(mockSetCurrentTrack).toHaveBeenCalledWith({
      title: "Test Song",
      artist: "Artist 1, Artist 2",
    });
  });

  it("handles player_state_changed with paused state", () => {
    renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["player_state_changed"]?.({
        paused: true,
        track_window: {
          current_track: {
            name: "Test Song",
            artists: [{ name: "Artist" }],
            album: { name: "Album" },
          },
        },
      });
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(false);
  });

  it("handles player_state_changed with null state", () => {
    renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["player_state_changed"]?.(null);
    });

    expect(mockSetPlaying).not.toHaveBeenCalled();
  });

  it("getOAuthToken callback provides token", async () => {
    renderHook(() => useSpotifyPlayer());

    const playerConstructorCall = (window.Spotify.Player as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const cb = vi.fn();

    await act(async () => {
      await playerConstructorCall.getOAuthToken(cb);
    });

    expect(cb).toHaveBeenCalledWith("test-token");
  });

  it("getOAuthToken does not call cb when token is null", async () => {
    mockGetValidToken.mockResolvedValue(null);

    renderHook(() => useSpotifyPlayer());

    const playerConstructorCall = (window.Spotify.Player as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const cb = vi.fn();

    await act(async () => {
      await playerConstructorCall.getOAuthToken(cb);
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it("syncs volume to player", () => {
    mockMusicVolume = 0.8;

    renderHook(() => useSpotifyPlayer());

    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.8);
  });

  it("togglePlay calls player.togglePlay", async () => {
    const { result } = renderHook(() => useSpotifyPlayer());

    await act(async () => {
      await result.current.togglePlay();
    });

    expect(mockPlayer.togglePlay).toHaveBeenCalled();
  });

  it("skip calls player.nextTrack", async () => {
    const { result } = renderHook(() => useSpotifyPlayer());

    await act(async () => {
      await result.current.skip();
    });

    expect(mockPlayer.nextTrack).toHaveBeenCalled();
  });

  it("previous calls player.previousTrack", async () => {
    const { result } = renderHook(() => useSpotifyPlayer());

    await act(async () => {
      await result.current.previous();
    });

    expect(mockPlayer.previousTrack).toHaveBeenCalled();
  });

  it("disconnect calls player.disconnect and resets state", () => {
    const { result } = renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["ready"]?.({ device_id: "device-123" });
    });

    expect(result.current.isReady).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(mockPlayer.disconnect).toHaveBeenCalled();
    expect(result.current.isReady).toBe(false);
    expect(result.current.deviceId).toBeNull();
  });

  it("togglePlay does nothing when player is not initialized", async () => {
    mockSource = "radio";
    const { result } = renderHook(() => useSpotifyPlayer());

    await act(async () => {
      await result.current.togglePlay();
    });
  });

  it("skip does nothing when player is not initialized", async () => {
    mockSource = "radio";
    const { result } = renderHook(() => useSpotifyPlayer());

    await act(async () => {
      await result.current.skip();
    });
  });

  it("previous does nothing when player is not initialized", async () => {
    mockSource = "radio";
    const { result } = renderHook(() => useSpotifyPlayer());

    await act(async () => {
      await result.current.previous();
    });
  });

  it("returns isPlaying from store", () => {
    mockIsPlaying = true;
    const { result } = renderHook(() => useSpotifyPlayer());
    expect(result.current.isPlaying).toBe(true);
  });

  it("does not create a second player if already initialized", () => {
    const { rerender } = renderHook(() => useSpotifyPlayer());

    rerender();

    expect(window.Spotify.Player).toHaveBeenCalledTimes(1);
  });

  it("handles player_state_changed without current_track", () => {
    renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["player_state_changed"]?.({
        paused: true,
        track_window: {
          current_track: null,
        },
      });
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(false);
    // setCurrentTrack should NOT be called when current_track is falsy
    expect(mockSetCurrentTrack).not.toHaveBeenCalled();
  });

  it("handles player_state_changed with no track_window", () => {
    renderHook(() => useSpotifyPlayer());

    act(() => {
      listeners["player_state_changed"]?.({
        paused: false,
      });
    });

    expect(mockSetPlaying).toHaveBeenCalledWith(true);
    expect(mockSetCurrentTrack).not.toHaveBeenCalled();
  });
});
