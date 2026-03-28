import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockSetSource = vi.fn();
const mockSetMusicVolume = vi.fn();
const mockSetLastfmUsername = vi.fn();

const mockMusicState = {
  source: "off" as string,
  musicVolume: 0.5,
  lastfmUsername: null as string | null,
  currentTrack: null as { title: string; artist: string } | null,
  isPlaying: false,
};

vi.mock("@/stores/music-store", () => ({
  useMusicStore: () => ({
    ...mockMusicState,
    setSource: mockSetSource,
    setMusicVolume: mockSetMusicVolume,
    setLastfmUsername: mockSetLastfmUsername,
  }),
}));

vi.mock("@/components/music/StationPicker", () => ({
  default: () => <div data-testid="station-picker">StationPicker</div>,
}));

import MusicSettings from "@/components/music/MusicSettings";

describe("MusicSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMusicState.source = "off";
    mockMusicState.musicVolume = 0.5;
    mockMusicState.lastfmUsername = null;
    mockMusicState.currentTrack = null;
    mockMusicState.isPlaying = false;
  });

  it("renders source toggle buttons", () => {
    render(<MusicSettings />);
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(screen.getByText("RADIO")).toBeInTheDocument();
    expect(screen.getByText("LAST.FM")).toBeInTheDocument();
    expect(screen.getByText("SPOTIFY")).toBeInTheDocument();
  });

  it("calls setSource when clicking source buttons", () => {
    render(<MusicSettings />);
    fireEvent.click(screen.getByText("RADIO"));
    expect(mockSetSource).toHaveBeenCalledWith("radio");
    fireEvent.click(screen.getByText("LAST.FM"));
    expect(mockSetSource).toHaveBeenCalledWith("lastfm");
    fireEvent.click(screen.getByText("SPOTIFY"));
    expect(mockSetSource).toHaveBeenCalledWith("spotify");
    fireEvent.click(screen.getByText("OFF"));
    expect(mockSetSource).toHaveBeenCalledWith("off");
  });

  it("shows StationPicker when source is radio", () => {
    mockMusicState.source = "radio";
    render(<MusicSettings />);
    expect(screen.getByTestId("station-picker")).toBeInTheDocument();
  });

  it("hides StationPicker when source is not radio", () => {
    mockMusicState.source = "off";
    render(<MusicSettings />);
    expect(screen.queryByTestId("station-picker")).toBeNull();
  });

  it("shows lastfm username input when source is lastfm", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    expect(screen.getByPlaceholderText("LAST.FM USERNAME")).toBeInTheDocument();
    expect(screen.getByText("CONNECT")).toBeInTheDocument();
  });

  it("calls setLastfmUsername on connect button click", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "testuser" } });
    fireEvent.click(screen.getByText("CONNECT"));
    expect(mockSetLastfmUsername).toHaveBeenCalledWith("testuser");
  });

  it("does not call setLastfmUsername if input is empty", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    fireEvent.click(screen.getByText("CONNECT"));
    expect(mockSetLastfmUsername).not.toHaveBeenCalled();
  });

  it("calls setLastfmUsername on Enter key", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "testuser" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSetLastfmUsername).toHaveBeenCalledWith("testuser");
  });

  it("does not call setLastfmUsername on Enter when empty", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSetLastfmUsername).not.toHaveBeenCalled();
  });

  it("does not call setLastfmUsername on non-Enter key", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "testuser" } });
    fireEvent.keyDown(input, { key: "a" });
    expect(mockSetLastfmUsername).not.toHaveBeenCalled();
  });

  it("shows now playing when lastfm is connected and playing", () => {
    mockMusicState.source = "lastfm";
    mockMusicState.lastfmUsername = "testuser";
    mockMusicState.isPlaying = true;
    mockMusicState.currentTrack = { title: "Song", artist: "Artist" };
    render(<MusicSettings />);
    expect(screen.getByText("Artist — Song")).toBeInTheDocument();
  });

  it("shows waiting message when lastfm connected but not playing", () => {
    mockMusicState.source = "lastfm";
    mockMusicState.lastfmUsername = "testuser";
    mockMusicState.isPlaying = false;
    render(<MusicSettings />);
    expect(screen.getByText("WAITING FOR SCROBBLE...")).toBeInTheDocument();
  });

  it("does not show now playing when no lastfm username", () => {
    mockMusicState.source = "lastfm";
    mockMusicState.lastfmUsername = null;
    render(<MusicSettings />);
    expect(screen.queryByText("WAITING FOR SCROBBLE...")).toBeNull();
  });

  it("shows spotify placeholder when source is spotify", () => {
    mockMusicState.source = "spotify";
    render(<MusicSettings />);
    expect(screen.getByText("SPOTIFY INTEGRATION")).toBeInTheDocument();
    expect(screen.getByText("COMING SOON — REQUIRES PREMIUM")).toBeInTheDocument();
  });

  it("shows volume slider when source is radio", () => {
    mockMusicState.source = "radio";
    render(<MusicSettings />);
    expect(screen.getByText(/MUSIC VOLUME/)).toBeInTheDocument();
    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
  });

  it("shows volume slider when source is spotify", () => {
    mockMusicState.source = "spotify";
    render(<MusicSettings />);
    expect(screen.getByText(/MUSIC VOLUME/)).toBeInTheDocument();
  });

  it("does not show volume slider when source is off", () => {
    mockMusicState.source = "off";
    render(<MusicSettings />);
    expect(screen.queryByText(/MUSIC VOLUME/)).toBeNull();
  });

  it("does not show volume slider when source is lastfm", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    expect(screen.queryByText(/MUSIC VOLUME/)).toBeNull();
  });

  it("calls setMusicVolume on slider change", () => {
    mockMusicState.source = "radio";
    render(<MusicSettings />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.8" } });
    expect(mockSetMusicVolume).toHaveBeenCalledWith(0.8);
  });

  it("shows volume hint for lastfm source", () => {
    mockMusicState.source = "lastfm";
    render(<MusicSettings />);
    expect(
      screen.getByText(
        "VOLUME IS CONTROLLED ON THE DEVICE THAT YOU'RE SCROBBLING FROM"
      )
    ).toBeInTheDocument();
  });

  it("initializes username input from lastfmUsername", () => {
    mockMusicState.source = "lastfm";
    mockMusicState.lastfmUsername = "existing";
    render(<MusicSettings />);
    expect(screen.getByPlaceholderText("LAST.FM USERNAME")).toHaveValue("existing");
  });
});
