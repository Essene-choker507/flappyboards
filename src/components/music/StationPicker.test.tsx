import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mockSetRadioStation = vi.fn();
const mockSetPlaying = vi.fn();
const mockRadioStation = { current: null as { url: string } | null };

const mockSearchStations = vi.fn();
const mockGetPopularStations = vi.fn();
const mockGetStationsByGenre = vi.fn();

vi.mock("@/lib/music/radio-browser", () => ({
  searchStations: (...args: unknown[]) => mockSearchStations(...args),
  getPopularStations: (...args: unknown[]) => mockGetPopularStations(...args),
  getStationsByGenre: (...args: unknown[]) => mockGetStationsByGenre(...args),
  GENRE_PRESETS: ["Jazz", "Rock", "Classical"],
}));

vi.mock("@/stores/music-store", () => ({
  useMusicStore: () => ({
    radioStation: mockRadioStation.current,
    setRadioStation: mockSetRadioStation,
    setPlaying: mockSetPlaying,
  }),
}));

import StationPicker from "@/components/music/StationPicker";

const sampleStations = [
  {
    name: "Jazz FM",
    url: "https://jazz.fm/stream",
    genre: "Jazz",
    country: "US",
    favicon: "",
    bitrate: 128,
    stationuuid: "uuid-1",
  },
  {
    name: "Rock Radio",
    url: "https://rock.fm/stream",
    genre: "Rock",
    country: "UK",
    favicon: "",
    bitrate: 192,
    stationuuid: "uuid-2",
  },
];

describe("StationPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRadioStation.current = null;
    mockGetPopularStations.mockResolvedValue(sampleStations);
    mockSearchStations.mockResolvedValue(sampleStations);
    mockGetStationsByGenre.mockResolvedValue(sampleStations);
  });

  it("loads popular stations on mount", async () => {
    render(<StationPicker />);
    expect(screen.getByText("LOADING...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Jazz FM")).toBeInTheDocument();
    });
    expect(mockGetPopularStations).toHaveBeenCalledWith(10);
  });

  it("renders search input and go button", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("SEARCH STATIONS...")).toBeInTheDocument();
    expect(screen.getByText("GO")).toBeInTheDocument();
  });

  it("renders genre preset buttons", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());
    expect(screen.getByText("Jazz")).toBeInTheDocument();
    expect(screen.getByText("Rock")).toBeInTheDocument();
    expect(screen.getByText("Classical")).toBeInTheDocument();
  });

  it("searches stations on GO button click", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("SEARCH STATIONS...");
    fireEvent.change(input, { target: { value: "jazz" } });
    fireEvent.click(screen.getByText("GO"));

    await waitFor(() => {
      expect(mockSearchStations).toHaveBeenCalledWith("jazz", 10);
    });
  });

  it("searches stations on Enter key", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("SEARCH STATIONS...");
    fireEvent.change(input, { target: { value: "rock" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockSearchStations).toHaveBeenCalledWith("rock", 10);
    });
  });

  it("does not search with empty query", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());
    fireEvent.click(screen.getByText("GO"));
    expect(mockSearchStations).not.toHaveBeenCalled();
  });

  it("filters by genre", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("Jazz"));
    });

    await waitFor(() => {
      expect(mockGetStationsByGenre).toHaveBeenCalledWith("Jazz", 10);
    });
  });

  it("selects a station", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Jazz FM"));
    expect(mockSetRadioStation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jazz FM", url: "https://jazz.fm/stream" })
    );
    expect(mockSetPlaying).toHaveBeenCalledWith(true);
  });

  it("shows play indicator for selected station", async () => {
    mockRadioStation.current = { url: "https://jazz.fm/stream" };
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());
    // The selected station shows a play indicator ▶
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("shows station genre and country", async () => {
    render(<StationPicker />);
    await waitFor(() => expect(screen.getByText("Jazz FM")).toBeInTheDocument());
    expect(screen.getByText("Jazz · US")).toBeInTheDocument();
    expect(screen.getByText("Rock · UK")).toBeInTheDocument();
  });
});
