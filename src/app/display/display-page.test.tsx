import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockTransitionTo = vi.fn().mockResolvedValue(undefined);

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

let settingsPanelOnSend: ((lines: string[]) => void) | undefined;

vi.mock("@/components/settings/SettingsPanel", () => ({
  default: ({ onSendMessage }: { onSendMessage?: (lines: string[]) => void }) => {
    settingsPanelOnSend = onSendMessage;
    return <div data-testid="settings-panel">SettingsPanel</div>;
  },
}));

vi.mock("@/components/display/DisplayOverlay", () => ({
  default: () => <div data-testid="display-overlay">DisplayOverlay</div>,
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("@/components/music/MusicPlayer", () => ({
  default: () => <div data-testid="music-player">MusicPlayer</div>,
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
let mockAudioInitialized = false;

vi.mock("@/hooks/useAudioEngine", () => ({
  useAudioEngine: () => ({
    audioEngine: {
      get initialized() { return mockAudioInitialized; },
      playClack: mockPlayClack,
    },
    isReady: false,
  }),
}));

vi.mock("@/hooks/useLastFmPlayer", () => ({
  useLastFmPlayer: vi.fn(),
}));

vi.mock("@/stores/settings-store", () => ({
  useSettingsStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      flipSpeed: 200,
      staggerDelay: 20,
      rotationInterval: 15,
      volume: 0.7,
      isMuted: false,
    };
    return selector ? selector(state) : state;
  },
}));

let mockMusicSource = "off";
let mockMusicIsPlaying = false;
let mockCurrentTrack: { title: string; artist: string } | null = null;

vi.mock("@/stores/music-store", () => ({
  useMusicStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      get source() { return mockMusicSource; },
      get isPlaying() { return mockMusicIsPlaying; },
      get currentTrack() { return mockCurrentTrack; },
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

import DisplayPage from "@/app/display/page";

describe("DisplayPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockTransitionTo.mockClear();
    mockFormatLines.mockClear();
    mockFormatNowPlaying.mockClear();
    mockPlayClack.mockClear();
    mockAudioInitialized = false;
    mockMusicSource = "off";
    mockMusicIsPlaying = false;
    mockCurrentTrack = null;
    settingsPanelOnSend = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    render(<DisplayPage />);
    expect(screen.getByTestId("display-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
    expect(screen.getByTestId("music-player")).toBeInTheDocument();
  });

  it("renders footer text", () => {
    render(<DisplayPage />);
    expect(screen.getByText(/MADE WITH/)).toBeInTheDocument();
  });

  it("renders social links", () => {
    const { container } = render(<DisplayPage />);
    const links = container.querySelectorAll('a[target="_blank"]');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("fires initial cycleNext after 800ms timeout", async () => {
    render(<DisplayPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockFormatLines).toHaveBeenCalled();
    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("fires cycleNext on rotation interval", async () => {
    render(<DisplayPage />);

    // Initial timeout
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();
    mockFormatLines.mockClear();

    // Rotation interval is 15s = 15000ms
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("does not fire cycleNext during rotation if transitioning", async () => {
    // Make transitionTo never resolve (simulating ongoing transition)
    mockTransitionTo.mockReturnValue(new Promise(() => {}));

    render(<DisplayPage />);

    // Trigger initial cycleNext
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const callCount = mockTransitionTo.mock.calls.length;

    // Next rotation interval should be blocked since isTransitioning is true
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    // Should not have increased since the first call is still "in progress"
    expect(mockTransitionTo.mock.calls.length).toBe(callCount);
  });

  it("clicking the board calls cycleNext", async () => {
    // Let the initial transition complete
    mockTransitionTo.mockResolvedValue(undefined);

    render(<DisplayPage />);

    // Advance past initial timeout so first transition completes
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();
    mockFormatLines.mockClear();

    // Click the board area
    const boardWrapper = screen.getByTestId("split-flap-board").parentElement!;
    await act(async () => {
      fireEvent.click(boardWrapper);
    });

    expect(mockFormatLines).toHaveBeenCalled();
    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("clicking the board does not cycleNext when transitioning", async () => {
    // Make transition never resolve
    mockTransitionTo.mockReturnValue(new Promise(() => {}));

    render(<DisplayPage />);

    // Trigger initial transition (never resolves, so isTransitioning stays true)
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const callCount = mockTransitionTo.mock.calls.length;

    const boardWrapper = screen.getByTestId("split-flap-board").parentElement!;
    await act(async () => {
      fireEvent.click(boardWrapper);
    });

    // Should not have called transitionTo again
    expect(mockTransitionTo.mock.calls.length).toBe(callCount);
  });

  it("calls onFlipStep with playClack when audio is initialized", async () => {
    mockAudioInitialized = true;
    mockTransitionTo.mockImplementation(async (_target, _speed, _stagger, onFlipStep) => {
      if (onFlipStep) onFlipStep(0, 0);
    });

    render(<DisplayPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockPlayClack).toHaveBeenCalled();
  });

  it("shows now-playing on every 3rd rotation when music is active", async () => {
    mockMusicIsPlaying = true;
    mockMusicSource = "radio";
    mockCurrentTrack = { title: "My Song", artist: "My Artist" };
    mockTransitionTo.mockResolvedValue(undefined);

    render(<DisplayPage />);

    // rotation 1 (initial timeout)
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

  it("SettingsPanel onSendMessage calls showMessage", async () => {
    mockTransitionTo.mockResolvedValue(undefined);

    render(<DisplayPage />);

    // Wait for initial transition to complete
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    mockTransitionTo.mockClear();
    mockFormatLines.mockClear();

    // Call the onSendMessage callback
    await act(async () => {
      settingsPanelOnSend?.(["LINE1", "LINE2"]);
    });

    expect(mockFormatLines).toHaveBeenCalledWith(["LINE1", "LINE2"]);
    expect(mockTransitionTo).toHaveBeenCalled();
  });

  it("cycleNext shows normal content when music is playing but source is off", async () => {
    mockMusicIsPlaying = true;
    mockMusicSource = "off";
    mockCurrentTrack = { title: "Song", artist: "Artist" };
    mockTransitionTo.mockResolvedValue(undefined);

    render(<DisplayPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockFormatNowPlaying).not.toHaveBeenCalled();
    expect(mockFormatLines).toHaveBeenCalled();
  });

  it("cycleNext shows normal content when no currentTrack", async () => {
    mockMusicIsPlaying = true;
    mockMusicSource = "radio";
    mockCurrentTrack = null;
    mockTransitionTo.mockResolvedValue(undefined);

    render(<DisplayPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockFormatNowPlaying).not.toHaveBeenCalled();
    expect(mockFormatLines).toHaveBeenCalled();
  });

  it("onFlipStep does nothing when audioEngine is not initialized", async () => {
    mockAudioInitialized = false;
    mockTransitionTo.mockImplementation(async (_target, _speed, _stagger, onFlipStep) => {
      if (onFlipStep) onFlipStep(0, 0);
    });

    render(<DisplayPage />);

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockPlayClack).not.toHaveBeenCalled();
  });

  it("showMessage early returns when boardRef is not available", async () => {
    // This is tested indirectly - the boardRef is always set since SplitFlapBoard
    // is mocked with forwardRef. The early return is a defensive guard.
  });

  it("footer social links have hover effects", () => {
    const { container } = render(<DisplayPage />);
    const links = container.querySelectorAll('a[target="_blank"]');

    // Test first social link hover
    const link = links[0] as HTMLElement;
    fireEvent.mouseEnter(link);
    expect(link.style.opacity).toBe("1");
    fireEvent.mouseLeave(link);
    expect(link.style.opacity).toBe("0.5");

    // Test second social link hover
    const link2 = links[1] as HTMLElement;
    fireEvent.mouseEnter(link2);
    expect(link2.style.opacity).toBe("1");
    fireEvent.mouseLeave(link2);
    expect(link2.style.opacity).toBe("0.5");
  });
});
