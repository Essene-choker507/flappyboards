import { describe, it, expect, beforeEach } from "vitest";
import { useMusicStore } from "@/stores/music-store";
import type { RadioStation, TrackInfo } from "@/stores/music-store";

const initialState = {
  source: "off" as const,
  isPlaying: false,
  currentTrack: null,
  radioStation: null,
  musicVolume: 0.5,
  lastfmUsername: null,
};

describe("useMusicStore", () => {
  beforeEach(() => {
    useMusicStore.setState(initialState);
  });

  it("has correct initial state", () => {
    const state = useMusicStore.getState();
    expect(state.source).toBe("off");
    expect(state.isPlaying).toBe(false);
    expect(state.currentTrack).toBeNull();
    expect(state.radioStation).toBeNull();
    expect(state.musicVolume).toBe(0.5);
    expect(state.lastfmUsername).toBeNull();
  });

  describe("setSource", () => {
    it("sets source to spotify", () => {
      useMusicStore.getState().setSource("spotify");
      const state = useMusicStore.getState();
      expect(state.source).toBe("spotify");
    });

    it("sets source to radio", () => {
      useMusicStore.getState().setSource("radio");
      expect(useMusicStore.getState().source).toBe("radio");
    });

    it("sets source to lastfm", () => {
      useMusicStore.getState().setSource("lastfm");
      expect(useMusicStore.getState().source).toBe("lastfm");
    });

    it("sets source to off", () => {
      useMusicStore.getState().setSource("spotify");
      useMusicStore.getState().setSource("off");
      expect(useMusicStore.getState().source).toBe("off");
    });

    it("resets isPlaying to false when source changes", () => {
      useMusicStore.setState({ isPlaying: true });
      useMusicStore.getState().setSource("radio");
      expect(useMusicStore.getState().isPlaying).toBe(false);
    });

    it("resets currentTrack to null when source changes", () => {
      useMusicStore.setState({
        currentTrack: { title: "Song", artist: "Artist" },
      });
      useMusicStore.getState().setSource("spotify");
      expect(useMusicStore.getState().currentTrack).toBeNull();
    });
  });

  describe("setPlaying", () => {
    it("sets isPlaying to true", () => {
      useMusicStore.getState().setPlaying(true);
      expect(useMusicStore.getState().isPlaying).toBe(true);
    });

    it("sets isPlaying to false", () => {
      useMusicStore.getState().setPlaying(true);
      useMusicStore.getState().setPlaying(false);
      expect(useMusicStore.getState().isPlaying).toBe(false);
    });
  });

  describe("setCurrentTrack", () => {
    it("sets a track", () => {
      const track: TrackInfo = { title: "Song", artist: "Artist" };
      useMusicStore.getState().setCurrentTrack(track);
      expect(useMusicStore.getState().currentTrack).toEqual(track);
    });

    it("clears the track with null", () => {
      useMusicStore.getState().setCurrentTrack({ title: "A", artist: "B" });
      useMusicStore.getState().setCurrentTrack(null);
      expect(useMusicStore.getState().currentTrack).toBeNull();
    });
  });

  describe("setRadioStation", () => {
    const station: RadioStation = {
      name: "Jazz FM",
      url: "https://stream.jazzfm.com",
      genre: "Jazz",
      country: "US",
      favicon: "https://jazzfm.com/icon.png",
    };

    it("sets radio station and updates currentTrack with radio info", () => {
      useMusicStore.getState().setRadioStation(station);
      const state = useMusicStore.getState();
      expect(state.radioStation).toEqual(station);
      expect(state.currentTrack).toEqual({
        title: "Jazz FM",
        artist: "Internet Radio",
      });
    });

    it("clears radio station and currentTrack when set to null", () => {
      useMusicStore.getState().setRadioStation(station);
      useMusicStore.getState().setRadioStation(null);
      const state = useMusicStore.getState();
      expect(state.radioStation).toBeNull();
      expect(state.currentTrack).toBeNull();
    });
  });

  describe("setMusicVolume", () => {
    it("sets music volume", () => {
      useMusicStore.getState().setMusicVolume(0.8);
      expect(useMusicStore.getState().musicVolume).toBe(0.8);
    });

    it("sets music volume to 0", () => {
      useMusicStore.getState().setMusicVolume(0);
      expect(useMusicStore.getState().musicVolume).toBe(0);
    });

    it("sets music volume to 1", () => {
      useMusicStore.getState().setMusicVolume(1);
      expect(useMusicStore.getState().musicVolume).toBe(1);
    });
  });

  describe("setLastfmUsername", () => {
    it("sets lastfm username", () => {
      useMusicStore.getState().setLastfmUsername("testuser");
      expect(useMusicStore.getState().lastfmUsername).toBe("testuser");
    });

    it("clears lastfm username with null", () => {
      useMusicStore.getState().setLastfmUsername("testuser");
      useMusicStore.getState().setLastfmUsername(null);
      expect(useMusicStore.getState().lastfmUsername).toBeNull();
    });
  });

  describe("persist partialize", () => {
    it("only persists source, radioStation, musicVolume, and lastfmUsername", () => {
      // The persist config's partialize should exclude isPlaying and currentTrack
      // We verify by checking that the store options include the partialize function
      const storeApi = useMusicStore;
      // Access persist options through the store's persist API
      const persistOptions = (storeApi as unknown as { persist: { getOptions: () => { partialize: (state: Record<string, unknown>) => Record<string, unknown> } } }).persist.getOptions();
      const partialized = persistOptions.partialize({
        source: "radio",
        isPlaying: true,
        currentTrack: { title: "T", artist: "A" },
        radioStation: null,
        musicVolume: 0.5,
        lastfmUsername: "user",
      } as unknown as Record<string, unknown>);
      expect(partialized).toEqual({
        source: "radio",
        radioStation: null,
        musicVolume: 0.5,
        lastfmUsername: "user",
      });
    });
  });
});
