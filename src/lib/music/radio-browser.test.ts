import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchStations,
  getStationsByGenre,
  getPopularStations,
  GENRE_PRESETS,
} from "@/lib/music/radio-browser";
import type { RadioStation } from "@/lib/music/radio-browser";

const BASE_URL = "https://de1.api.radio-browser.info/json";

function makeRawStation(overrides: Record<string, unknown> = {}) {
  return {
    name: " Test Station ",
    url_resolved: "https://stream.example.com/radio",
    tags: "jazz,smooth",
    country: "US",
    favicon: "https://example.com/icon.png",
    bitrate: 128,
    stationuuid: "abc-123",
    ...overrides,
  };
}

describe("radio-browser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GENRE_PRESETS", () => {
    it("exports an array of genre strings", () => {
      expect(GENRE_PRESETS).toBeInstanceOf(Array);
      expect(GENRE_PRESETS.length).toBe(10);
      expect(GENRE_PRESETS).toContain("lofi");
      expect(GENRE_PRESETS).toContain("jazz");
      expect(GENRE_PRESETS).toContain("rock");
    });
  });

  describe("searchStations", () => {
    it("fetches stations by name and maps results", async () => {
      const raw = [makeRawStation()];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("jazz");

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/stations/byname/jazz?limit=20&order=clickcount&reverse=true&hidebroken=true`,
        { headers: { "User-Agent": "FlappyBoards/1.0" } }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<RadioStation>({
        name: "Test Station",
        url: "https://stream.example.com/radio",
        genre: "jazz",
        country: "US",
        favicon: "https://example.com/icon.png",
        bitrate: 128,
        stationuuid: "abc-123",
      });
    });

    it("uses custom limit parameter", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await searchStations("rock", 5);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=5"),
        expect.any(Object)
      );
    });

    it("encodes query parameter", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await searchStations("hip hop");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("hip%20hop"),
        expect.any(Object)
      );
    });

    it("returns empty array when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await searchStations("test");
      expect(result).toEqual([]);
    });

    it("filters out non-HTTPS stations", async () => {
      const raw = [
        makeRawStation({ url_resolved: "http://insecure.example.com/radio" }),
        makeRawStation({ url_resolved: "https://secure.example.com/radio", name: "Secure" }),
      ];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Secure");
    });

    it("filters out stations with null/undefined url_resolved", async () => {
      const raw = [
        makeRawStation({ url_resolved: null }),
        makeRawStation({ url_resolved: undefined }),
        makeRawStation({ url_resolved: "" }),
      ];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result).toEqual([]);
    });

    it("maps station with empty tags to genre 'Various'", async () => {
      const raw = [makeRawStation({ tags: "" })];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result[0].genre).toBe("Various");
    });

    it("maps station with undefined tags to genre 'Various'", async () => {
      const raw = [makeRawStation({ tags: undefined })];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result[0].genre).toBe("Various");
    });

    it("uses only the first tag as genre", async () => {
      const raw = [makeRawStation({ tags: "blues,rock,soul" })];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result[0].genre).toBe("blues");
    });

    it("trims station name whitespace", async () => {
      const raw = [makeRawStation({ name: "  My Station  " })];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result[0].name).toBe("My Station");
    });

    it("trims genre tag whitespace", async () => {
      const raw = [makeRawStation({ tags: "  jazz  , smooth " })];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await searchStations("test");
      expect(result[0].genre).toBe("jazz");
    });
  });

  describe("getStationsByGenre", () => {
    it("fetches stations by tag", async () => {
      const raw = [makeRawStation()];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await getStationsByGenre("lofi");

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/stations/bytag/lofi?limit=20&order=clickcount&reverse=true&hidebroken=true`,
        { headers: { "User-Agent": "FlappyBoards/1.0" } }
      );
      expect(result).toHaveLength(1);
    });

    it("uses custom limit parameter", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getStationsByGenre("ambient", 10);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.any(Object)
      );
    });

    it("encodes genre parameter", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getStationsByGenre("drum and bass");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("drum%20and%20bass"),
        expect.any(Object)
      );
    });

    it("returns empty array when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await getStationsByGenre("lofi");
      expect(result).toEqual([]);
    });

    it("filters out non-HTTPS stations", async () => {
      const raw = [
        makeRawStation({ url_resolved: "http://insecure.example.com/radio" }),
        makeRawStation({ url_resolved: "https://secure.example.com/radio", name: "Secure" }),
      ];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await getStationsByGenre("jazz");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Secure");
    });
  });

  describe("getPopularStations", () => {
    it("fetches top click stations with default limit", async () => {
      const raw = [makeRawStation()];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await getPopularStations();

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/stations/topclick/20?hidebroken=true`,
        { headers: { "User-Agent": "FlappyBoards/1.0" } }
      );
      expect(result).toHaveLength(1);
    });

    it("uses custom limit parameter", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getPopularStations(50);

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/stations/topclick/50?hidebroken=true`,
        expect.any(Object)
      );
    });

    it("returns empty array when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await getPopularStations();
      expect(result).toEqual([]);
    });

    it("filters out non-HTTPS stations", async () => {
      const raw = [
        makeRawStation({ url_resolved: "http://insecure.example.com/radio" }),
        makeRawStation({ url_resolved: "https://secure.example.com/radio", name: "Secure" }),
      ];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });

      const result = await getPopularStations();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Secure");
    });
  });
});
