import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatWeatherContent, fetchWeather } from "@/lib/content/weather";

describe("weather", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatWeatherContent", () => {
    it("formats weather data into a ContentItem with 6 lines", () => {
      const data = {
        location: "New York",
        temp: 72,
        condition: "Sunny",
        high: 78,
        low: 65,
        humidity: 45,
        wind: "10 mph NW",
      };

      const result = formatWeatherContent(data);

      expect(result.type).toBe("weather");
      expect(result.id).toMatch(/^weather-\d+$/);
      expect(result.lines).toHaveLength(6);
      expect(result.lines[0]).toContain("WEATHER");
      expect(result.lines[0]).toContain("NEW YORK");
      expect(result.lines[1]).toContain("72F");
      expect(result.lines[1]).toContain("SUNNY");
      expect(result.lines[2]).toContain("HIGH 78F");
      expect(result.lines[2]).toContain("LOW 65F");
      expect(result.lines[3]).toContain("HUMIDITY 45%");
      expect(result.lines[4]).toContain("WIND 10 MPH NW");
      expect(result.lines[5]).toBe("");
    });

    it("truncates location to 11 characters", () => {
      const data = {
        location: "San Francisco Bay Area",
        temp: 60,
        condition: "Cloudy",
        high: 64,
        low: 55,
        humidity: 80,
        wind: "5 mph W",
      };

      const result = formatWeatherContent(data);
      // "SAN FRANCISCO BAY AREA".slice(0, 11) = "SAN FRANCIS"
      expect(result.lines[0]).toContain("SAN FRANCIS");
      expect(result.lines[0]).not.toContain("SAN FRANCISCO");
    });

    it("truncates condition to 15 characters", () => {
      const data = {
        location: "LA",
        temp: 85,
        condition: "Partly Cloudy Skies Today",
        high: 90,
        low: 70,
        humidity: 30,
        wind: "3 mph S",
      };

      const result = formatWeatherContent(data);
      // "PARTLY CLOUDY SKIES TODAY".slice(0, 15) = "PARTLY CLOUDY S"
      expect(result.lines[1]).toContain("PARTLY CLOUDY S");
      expect(result.lines[1]).not.toContain("PARTLY CLOUDY SKIES");
    });

    it("generates unique IDs based on Date.now()", () => {
      const data = {
        location: "Boston",
        temp: 50,
        condition: "Rain",
        high: 55,
        low: 42,
        humidity: 90,
        wind: "15 mph E",
      };

      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1234567890);
      const result = formatWeatherContent(data);
      expect(result.id).toBe("weather-1234567890");
      nowSpy.mockRestore();
    });
  });

  describe("fetchWeather", () => {
    it("fetches weather data and returns formatted ContentItem", async () => {
      const mockData = {
        location: "Denver",
        temp: 65,
        condition: "Clear",
        high: 70,
        low: 50,
        humidity: 25,
        wind: "8 mph N",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchWeather(39.7392, -104.9903);

      expect(fetch).toHaveBeenCalledWith("/api/weather?lat=39.7392&lon=-104.9903");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("weather");
      expect(result!.lines[0]).toContain("DENVER");
    });

    it("returns null when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await fetchWeather(0, 0);
      expect(result).toBeNull();
    });

    it("returns null when fetch throws an error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await fetchWeather(0, 0);
      expect(result).toBeNull();
    });
  });
});
