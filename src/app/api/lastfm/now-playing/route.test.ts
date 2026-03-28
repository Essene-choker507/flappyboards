import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// We need to dynamically import the route so env stubs take effect
// at module-evaluation time. Cache-bust between tests.
const makeRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost:3000/api/lastfm/now-playing");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url);
};

describe("GET /api/lastfm/now-playing", () => {
  const originalEnv = process.env.LASTFM_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.LASTFM_API_KEY = "test-api-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LASTFM_API_KEY = originalEnv;
    } else {
      delete process.env.LASTFM_API_KEY;
    }
  });

  // Fresh import each test to pick up env changes for the module-level const
  async function importGET() {
    // Reset module cache so API_KEY re-evaluates
    vi.resetModules();
    const mod = await import("@/app/api/lastfm/now-playing/route");
    return mod.GET;
  }

  it("returns 400 when user parameter is missing", async () => {
    const GET = await importGET();
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing user parameter");
  });

  it("returns 500 when API key is not configured", async () => {
    process.env.LASTFM_API_KEY = "";
    const GET = await importGET();
    const res = await GET(makeRequest({ user: "testuser" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Last.fm API key not configured");
  });

  it("returns 502 when Last.fm API returns a non-404 error", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Last.fm API error");
  });

  it("returns 404 when Last.fm API returns 404 (user not found)", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    const res = await GET(makeRequest({ user: "nonexistent" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });

  it("returns isPlaying false when no tracks exist", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ recenttracks: { track: [] } }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ isPlaying: false, track: null });
  });

  it("returns isPlaying false when tracks is null/undefined", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ recenttracks: {} }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ isPlaying: false, track: null });
  });

  it("returns currently playing track from array", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recenttracks: {
            track: [
              {
                name: "Bohemian Rhapsody",
                artist: { "#text": "Queen" },
                "@attr": { nowplaying: "true" },
              },
            ],
          },
        }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPlaying).toBe(true);
    expect(body.track.title).toBe("Bohemian Rhapsody");
    expect(body.track.artist).toBe("Queen");
  });

  it("returns not playing when latest track has no nowplaying attr", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recenttracks: {
            track: [
              {
                name: "Yesterday",
                artist: { "#text": "The Beatles" },
              },
            ],
          },
        }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    const body = await res.json();
    expect(body.isPlaying).toBe(false);
    expect(body.track.title).toBe("Yesterday");
    expect(body.track.artist).toBe("The Beatles");
  });

  it("handles a single track object (not an array)", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recenttracks: {
            track: {
              name: "Solo Track",
              artist: { name: "Solo Artist" },
              "@attr": { nowplaying: "true" },
            },
          },
        }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    const body = await res.json();
    expect(body.isPlaying).toBe(true);
    expect(body.track.title).toBe("Solo Track");
    expect(body.track.artist).toBe("Solo Artist");
  });

  it("falls back to 'Unknown' when track name and artist are missing", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recenttracks: {
            track: [
              {
                // no name, no artist
              },
            ],
          },
        }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    const body = await res.json();
    expect(body.track.title).toBe("Unknown");
    expect(body.track.artist).toBe("Unknown");
  });

  it("uses artist.name when artist.#text is not available", async () => {
    const GET = await importGET();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recenttracks: {
            track: [
              {
                name: "Test Song",
                artist: { name: "Artist Name" },
              },
            ],
          },
        }),
      })
    );

    const res = await GET(makeRequest({ user: "testuser" }));
    const body = await res.json();
    expect(body.track.artist).toBe("Artist Name");
  });

  it("passes correct query parameters to Last.fm API", async () => {
    const GET = await importGET();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recenttracks: { track: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await GET(makeRequest({ user: "myuser" }));

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("method=user.getrecenttracks");
    expect(calledUrl).toContain("user=myuser");
    expect(calledUrl).toContain("api_key=test-api-key");
    expect(calledUrl).toContain("format=json");
    expect(calledUrl).toContain("limit=1");
  });
});
