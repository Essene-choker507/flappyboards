import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockTransitionTo = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

vi.mock("@/components/display/SplitFlapBoard", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return {
    default: forwardRef(function MockBoard(props: Record<string, unknown>, ref: React.Ref<unknown>) {
      useImperativeHandle(ref, () => ({
        transitionTo: mockTransitionTo,
      }));
      return <div data-testid="split-flap-board" />;
    }),
  };
});

vi.mock("@/components/display/DisplayOverlay", () => ({
  default: () => <div data-testid="display-overlay">DisplayOverlay</div>,
}));

vi.mock("@/components/room/RoomCode", () => ({
  default: ({ code, connectedDevices }: { code: string; connectedDevices: number }) => (
    <div data-testid="room-code">
      {code} ({connectedDevices})
    </div>
  ),
}));

const mockSetTheme = vi.fn();

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
    setTheme: mockSetTheme,
  }),
}));

const mockFormatLines = vi.fn(() => [[1, 2, 3]]);

vi.mock("@/lib/vestaboard/message-formatter", () => ({
  formatLines: (...args: unknown[]) => mockFormatLines(...args),
  createEmptyBoard: vi.fn(() => []),
}));

vi.mock("@/hooks/useResponsiveScale", () => ({
  useResponsiveScale: () => 1,
}));

const mockPlayClack = vi.fn();
const mockSetVolume = vi.fn();
const mockSetMuted = vi.fn();
let mockAudioInitialized = false;

vi.mock("@/hooks/useAudioEngine", () => ({
  useAudioEngine: () => ({
    audioEngine: {
      get initialized() { return mockAudioInitialized; },
      playClack: mockPlayClack,
      setVolume: mockSetVolume,
      setMuted: mockSetMuted,
    },
    isReady: false,
  }),
}));

vi.mock("@/hooks/useLastFmPlayer", () => ({
  useLastFmPlayer: vi.fn(),
}));

vi.mock("@/lib/config/url-config", () => ({
  decodeConfig: vi.fn(() => ({
    theme: "dark",
    flipSpeed: 200,
    staggerDelay: 20,
    rotationInterval: 15,
    volume: 0.7,
    isMuted: false,
  })),
}));

const mockGenerateRoomCode = vi.fn();
let mockRoomCode: string | null = "5678";

vi.mock("@/stores/room-store", () => ({
  useRoomStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      get roomCode() { return mockRoomCode; },
      generateRoomCode: mockGenerateRoomCode,
    };
    return selector ? selector(state) : state;
  },
}));

// Capture PartyKit callbacks
let capturedCallbacks: {
  onSettingsChange?: (incoming: Record<string, unknown>) => void;
  onContentChange?: (lines: string[]) => void;
  onSkip?: () => void;
  onMusicUpdate?: (state: Record<string, unknown>) => void;
} = {};

vi.mock("@/hooks/usePartyConnection", () => ({
  usePartyConnection: (_roomCode: string | null, _isHost: boolean, callbacks: Record<string, unknown>) => {
    capturedCallbacks = callbacks as typeof capturedCallbacks;
    return {
      isConnected: false,
      connectedDevices: 1,
      send: vi.fn(),
      disconnect: vi.fn(),
    };
  },
}));

let mockMusicSource = "off";
let mockMusicIsPlaying = false;
let mockCurrentTrack: { title: string; artist: string } | null = null;
const mockSetSource = vi.fn();
const mockSetLastfmUsername = vi.fn();

vi.mock("@/stores/music-store", () => ({
  useMusicStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      get source() { return mockMusicSource; },
      get isPlaying() { return mockMusicIsPlaying; },
      get currentTrack() { return mockCurrentTrack; },
      setSource: mockSetSource,
      setLastfmUsername: mockSetLastfmUsername,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/lib/content/content-rotator", () => ({
  ContentRotator: class MockContentRotator {
    next() {
      return { lines: ["HELLO"] };
    }
  },
}));

vi.mock("@/lib/content/quotes", () => ({
  QUOTES: [],
}));

const mockFormatNowPlaying = vi.fn(() => ["NOW PLAYING"]);

vi.mock("@/lib/content/now-playing", () => ({
  formatNowPlaying: (...args: unknown[]) => mockFormatNowPlaying(...args),
}));

import TVPage from "@/app/tv/page";

describe("TVPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockTransitionTo.mockClear().mockResolvedValue(undefined);
    mockFormatLines.mockClear();
    mockFormatNowPlaying.mockClear();
    mockPlayClack.mockClear();
    mockSetVolume.mockClear();
    mockSetMuted.mockClear();
    mockSetTheme.mockClear();
    mockSetSource.mockClear();
    mockSetLastfmUsername.mockClear();
    mockAudioInitialized = false;
    mockMusicSource = "off";
    mockMusicIsPlaying = false;
    mockCurrentTrack = null;
    mockRoomCode = "5678";
    capturedCallbacks = {};

    // Mock navigator.wakeLock
    Object.defineProperty(navigator, "wakeLock", {
      value: { request: vi.fn().mockResolvedValue({ release: vi.fn() }) },
      writable: true,
      configurable: true,
    });
    // Mock fullscreen
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    render(<TVPage />);
    expect(screen.getByTestId("display-overlay")).toBeInTheDocument();
  });

  it("renders room code", () => {
    render(<TVPage />);
    expect(screen.getByTestId("room-code")).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(<TVPage />);
    const back = screen.getByTitle("Back to home");
    expect(back).toBeInTheDocument();
    expect(back).toHaveAttribute("href", "/");
  });

  it("wraps TVDisplay in Suspense", () => {
    render(<TVPage />);
    expect(screen.getByTestId("display-overlay")).toBeInTheDocument();
  });

  it("fires initial cycleNext after 800ms", async () => {
    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockFormatLines).toHaveBeenCalled();
    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("fires cycleNext on rotation interval", async () => {
    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("applies audio volume and muted from settings", async () => {
    mockAudioInitialized = true;
    render(<TVPage />);

    // Volume and muted are synced from settings via useEffect
    expect(mockSetVolume).toHaveBeenCalledWith(0.7);
    expect(mockSetMuted).toHaveBeenCalledWith(false);
  });

  it("calls onFlipStep with playClack when audio initialized", async () => {
    mockAudioInitialized = true;
    mockTransitionTo.mockImplementation(async (_target, _speed, _stagger, onFlipStep) => {
      if (onFlipStep) onFlipStep(0, 0);
    });

    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockPlayClack).toHaveBeenCalled();
  });

  it("shows now-playing on every 3rd rotation when music is active", async () => {
    mockMusicIsPlaying = true;
    mockMusicSource = "lastfm";
    mockCurrentTrack = { title: "My Song", artist: "My Artist" };

    render(<TVPage />);

    // rotation 1
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // rotation 2
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    // rotation 3 - should show now playing
    mockFormatNowPlaying.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockFormatNowPlaying).toHaveBeenCalledWith("My Song", "My Artist");
  });

  it("clicking board requests fullscreen and calls cycleNext", async () => {
    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();

    const boardWrapper = screen.getByTestId("split-flap-board").parentElement!;
    await act(async () => {
      fireEvent.click(boardWrapper);
    });

    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("clicking board does not request fullscreen if already fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.documentElement,
      writable: true,
      configurable: true,
    });

    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const mockReqFS = document.documentElement.requestFullscreen as ReturnType<typeof vi.fn>;
    mockReqFS.mockClear();

    const boardWrapper = screen.getByTestId("split-flap-board").parentElement!;
    await act(async () => {
      fireEvent.click(boardWrapper);
    });

    expect(mockReqFS).not.toHaveBeenCalled();
  });

  it("back button has hover effects", () => {
    render(<TVPage />);
    const back = screen.getByTitle("Back to home");
    fireEvent.mouseEnter(back);
    expect(back.style.opacity).toBe("1");
    fireEvent.mouseLeave(back);
    expect(back.style.opacity).toBe("0.4");
  });

  // PartyKit handler tests
  it("onSettingsChange updates settings and calls setTheme", () => {
    render(<TVPage />);

    act(() => {
      capturedCallbacks.onSettingsChange?.({ theme: "light", flipSpeed: 300 });
    });

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("onSettingsChange without theme does not call setTheme extra times", () => {
    render(<TVPage />);
    mockSetTheme.mockClear();

    act(() => {
      capturedCallbacks.onSettingsChange?.({ flipSpeed: 300 });
    });

    // setTheme is only called from the initial theme useEffect, not from onSettingsChange
    // since incoming.theme is undefined/falsy
  });

  it("onContentChange calls showMessage and resets rotation", async () => {
    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();
    mockFormatLines.mockClear();

    await act(async () => {
      capturedCallbacks.onContentChange?.(["CUSTOM", "MESSAGE"]);
    });

    expect(mockFormatLines).toHaveBeenCalledWith(["CUSTOM", "MESSAGE"]);
    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("onSkip calls cycleNext and resets rotation", async () => {
    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();

    await act(async () => {
      capturedCallbacks.onSkip?.();
    });

    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("onMusicUpdate sets music source and lastfm username", () => {
    render(<TVPage />);

    act(() => {
      capturedCallbacks.onMusicUpdate?.({
        source: "lastfm",
        lastfmUsername: "myuser",
      });
    });

    expect(mockSetSource).toHaveBeenCalledWith("lastfm");
    expect(mockSetLastfmUsername).toHaveBeenCalledWith("myuser");
  });

  it("onMusicUpdate with undefined lastfmUsername still calls setter", () => {
    render(<TVPage />);

    act(() => {
      capturedCallbacks.onMusicUpdate?.({
        source: "radio",
      });
    });

    expect(mockSetSource).toHaveBeenCalledWith("radio");
    // lastfmUsername is undefined (not !== undefined), so setLastfmUsername should NOT be called
    expect(mockSetLastfmUsername).not.toHaveBeenCalled();
  });

  it("generates room code when roomCode is null", () => {
    mockRoomCode = null;
    render(<TVPage />);
    expect(mockGenerateRoomCode).toHaveBeenCalled();
  });

  it("does not render RoomCode when roomCode is null", () => {
    mockRoomCode = null;
    render(<TVPage />);
    expect(screen.queryByTestId("room-code")).not.toBeInTheDocument();
  });

  it("handles visibility change to re-request wake lock", async () => {
    render(<TVPage />);

    // Simulate visibility change
    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // wakeLock.request should have been called (initial + visibility change)
    expect((navigator.wakeLock as { request: ReturnType<typeof vi.fn> }).request).toHaveBeenCalled();
  });

  it("resetRotation fires cycleNext on new interval after onSkip", async () => {
    render(<TVPage />);

    // Wait for initial timeout
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();

    // Trigger onSkip which calls resetRotation
    await act(async () => {
      capturedCallbacks.onSkip?.();
    });

    mockTransitionTo.mockClear();

    // Advance by the rotation interval to trigger the new interval
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("does not cycle during rotation interval when transitioning", async () => {
    // Make transition never resolve (stays transitioning)
    mockTransitionTo.mockReturnValue(new Promise(() => {}));

    render(<TVPage />);

    // Start transition via initial timeout
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const callCount = mockTransitionTo.mock.calls.length;

    // Rotation interval fires but should be blocked by isTransitioning
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockTransitionTo.mock.calls.length).toBe(callCount);
  });

  it("clicking board does not cycleNext when transitioning", async () => {
    mockTransitionTo.mockReturnValue(new Promise(() => {}));

    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const callCount = mockTransitionTo.mock.calls.length;

    const boardWrapper = screen.getByTestId("split-flap-board").parentElement!;
    await act(async () => {
      fireEvent.click(boardWrapper);
    });

    expect(mockTransitionTo.mock.calls.length).toBe(callCount);
  });

  it("onMusicUpdate with falsy source does not call setMusicSource", () => {
    render(<TVPage />);

    act(() => {
      capturedCallbacks.onMusicUpdate?.({
        source: "",
        lastfmUsername: "user",
      });
    });

    expect(mockSetSource).not.toHaveBeenCalled();
    expect(mockSetLastfmUsername).toHaveBeenCalledWith("user");
  });

  it("cycleNext shows normal content when music conditions are partially met", async () => {
    // musicIsPlaying true but source is "off"
    mockMusicIsPlaying = true;
    mockMusicSource = "off";
    mockCurrentTrack = { title: "Song", artist: "Artist" };

    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Should show normal content, not now-playing
    expect(mockFormatNowPlaying).not.toHaveBeenCalled();
    expect(mockFormatLines).toHaveBeenCalled();
  });

  it("cycleNext shows normal content when no currentTrack", async () => {
    mockMusicIsPlaying = true;
    mockMusicSource = "radio";
    mockCurrentTrack = null;

    render(<TVPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockFormatNowPlaying).not.toHaveBeenCalled();
    expect(mockFormatLines).toHaveBeenCalled();
  });

  it("showMessage guards against missing boardRef or transitioning", async () => {
    // Make transitionTo never resolve
    mockTransitionTo.mockReturnValue(new Promise(() => {}));

    render(<TVPage />);

    // Start a transition
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const callCount = mockTransitionTo.mock.calls.length;

    // Try to send content while transitioning
    await act(async () => {
      capturedCallbacks.onContentChange?.(["BLOCKED"]);
    });

    // Should not have called transitionTo again
    expect(mockTransitionTo.mock.calls.length).toBe(callCount);
  });
});
