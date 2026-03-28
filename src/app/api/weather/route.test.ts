import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost:3000/api/weather");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
};

describe("GET /api/weather", () => {
  const originalEnv = process.env.WEATHER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.WEATHER_API_KEY = "test-weather-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.WEATHER_API_KEY = originalEnv;
    } else {
      delete process.env.WEATHER_API_KEY;
    }
  });

  async function importGET() {
    vi.resetModules();
    const mod = await import("@/app/api/weather/route");
    return mod.GET;
  }

  it("returns 503 when API key is not configured", async () => {
    delete process.env.WEATHER_API_KEY;
    const GET = await importGET();
    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Weather API key not configured");
  });

  it("returns 400 when lat is missing", async () => {
    const GET = await importGET();
    const res = await GET(makeRequest({ lon: "-74" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("lat and lon are required");
  });

  it("returns 400 when lon is missing", async () => {
    const GET = await importGET();
    const res = await GET(makeRequest({ lat: "40" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("lat and lon are required");
  });

  it("returns 400 when both lat and lon are missing", async () => {
    const GET = await importGET();
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("lat and lon are required");
  });

  it("returns 502 when upstream API returns not ok", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Weather fetch failed");
  });

  it("returns 502 when fetch throws an error", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Weather service unavailable");
  });

  it("returns 200 with formatted weather data on success", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: "New York",
          main: {
            temp: 72.4,
            temp_max: 78.9,
            temp_min: 65.1,
            humidity: 55,
          },
          weather: [{ main: "Clouds" }],
          wind: { speed: 12.3 },
        }),
      })
    );

    const res = await GET(makeRequest({ lat: "40.7", lon: "-74.0" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      location: "New York",
      temp: 72,
      condition: "Clouds",
      high: 79,
      low: 65,
      humidity: 55,
      wind: "12 MPH",
    });
  });

  it("uses fallback values when weather data fields are missing", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    );

    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      location: "UNKNOWN",
      temp: 0,
      condition: "CLEAR",
      high: 0,
      low: 0,
      humidity: 0,
      wind: "0 MPH",
    });
  });

  it("passes correct URL to OpenWeatherMap API", async () => {
    const GET = await importGET();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Test",
        main: { temp: 70, temp_max: 75, temp_min: 65, humidity: 50 },
        weather: [{ main: "Clear" }],
        wind: { speed: 5 },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await GET(makeRequest({ lat: "40.7", lon: "-74.0" }));

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("lat=40.7");
    expect(calledUrl).toContain("lon=-74.0");
    expect(calledUrl).toContain("units=imperial");
    expect(calledUrl).toContain("appid=test-weather-key");
  });
});
