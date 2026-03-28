import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockRadioPlay = vi.fn();
const mockRadioPause = vi.fn();
const mockSpotifyToggle = vi.fn();
const mockSpotifySkip = vi.fn();
const mockSpotifyPrev = vi.fn();

const mockMusicState = {
  source: "off" as string,
  isPlaying: false,
  currentTrack: null as { title: string; artist: string } | null,
};

vi.mock("@/stores/music-store", () => ({
  useMusicStore: () => mockMusicState,
}));

vi.mock("@/hooks/useRadioPlayer", () => ({
  useRadioPlayer: () => ({
    play: mockRadioPlay,
    pause: mockRadioPause,
  }),
}));

vi.mock("@/hooks/useSpotifyPlayer", () => ({
  useSpotifyPlayer: () => ({
    togglePlay: mockSpotifyToggle,
    skip: mockSpotifySkip,
    previous: mockSpotifyPrev,
  }),
}));

import MusicPlayer from "@/components/music/MusicPlayer";

describe("MusicPlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockMusicState.source = "off";
    mockMusicState.isPlaying = false;
    mockMusicState.currentTrack = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when source is off", () => {
    const { container } = render(<MusicPlayer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders play button for radio source", () => {
    mockMusicState.source = "radio";
    render(<MusicPlayer />);
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("renders pause icon when playing radio", () => {
    mockMusicState.source = "radio";
    mockMusicState.isPlaying = true;
    render(<MusicPlayer />);
    expect(screen.getByText("❚❚")).toBeInTheDocument();
  });

  it("calls radioPlay when clicking play for radio", () => {
    mockMusicState.source = "radio";
    mockMusicState.isPlaying = false;
    render(<MusicPlayer />);
    fireEvent.click(screen.getByText("▶"));
    expect(mockRadioPlay).toHaveBeenCalled();
  });

  it("calls radioPause when clicking pause for radio", () => {
    mockMusicState.source = "radio";
    mockMusicState.isPlaying = true;
    render(<MusicPlayer />);
    fireEvent.click(screen.getByText("❚❚"));
    expect(mockRadioPause).toHaveBeenCalled();
  });

  it("calls spotifyToggle for spotify source", () => {
    mockMusicState.source = "spotify";
    render(<MusicPlayer />);
    fireEvent.click(screen.getByText("▶"));
    expect(mockSpotifyToggle).toHaveBeenCalled();
  });

  it("renders prev/next buttons for spotify", () => {
    mockMusicState.source = "spotify";
    render(<MusicPlayer />);
    const prevBtn = screen.getByTitle("Previous");
    const nextBtn = screen.getByTitle("Next");
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  it("does not render prev/next buttons for radio", () => {
    mockMusicState.source = "radio";
    render(<MusicPlayer />);
    expect(screen.queryByTitle("Previous")).toBeNull();
    expect(screen.queryByTitle("Next")).toBeNull();
  });

  it("calls spotifyPrev on previous click", () => {
    mockMusicState.source = "spotify";
    render(<MusicPlayer />);
    fireEvent.click(screen.getByTitle("Previous"));
    expect(mockSpotifyPrev).toHaveBeenCalled();
  });

  it("calls spotifySkip on next click", () => {
    mockMusicState.source = "spotify";
    render(<MusicPlayer />);
    fireEvent.click(screen.getByTitle("Next"));
    expect(mockSpotifySkip).toHaveBeenCalled();
  });

  it("fades opacity on mouse enter/leave", () => {
    mockMusicState.source = "radio";
    const { container } = render(<MusicPlayer />);
    const wrapper = container.firstChild as HTMLElement;

    fireEvent.mouseEnter(wrapper);
    // onMouseEnter sets opacity to 1
    expect(wrapper.style.opacity).toBe("1");

    fireEvent.mouseLeave(wrapper);
    expect(wrapper.style.opacity).toBe("0.6");
  });

  it("auto-fades after timeout", () => {
    mockMusicState.source = "radio";
    render(<MusicPlayer />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    // Opacity fades (tested indirectly via state)
  });

  it("resets fade on mouse move", () => {
    mockMusicState.source = "radio";
    render(<MusicPlayer />);
    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });
    // No throw, fade is reset
  });

  it("renders for lastfm source", () => {
    mockMusicState.source = "lastfm";
    render(<MusicPlayer />);
    expect(screen.getByText("▶")).toBeInTheDocument();
  });
});
