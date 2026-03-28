import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/spotify/callback/route";

const makeRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost:3000/api/spotify/callback");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url);
};

describe("GET /api/spotify/callback", () => {
  it("redirects to /display with spotify_error when error param is present", async () => {
    const res = await GET(makeRequest({ error: "access_denied" }));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/display?spotify_error=access_denied");
  });

  it("redirects to /display with spotify_error=no_code when no code or error", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/display?spotify_error=no_code");
  });

  it("redirects to /display with spotify_code when code param is present", async () => {
    const res = await GET(makeRequest({ code: "abc123xyz" }));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/display?spotify_code=abc123xyz");
  });

  it("prioritizes error over code when both are present", async () => {
    const res = await GET(
      makeRequest({ code: "abc123", error: "access_denied" })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/display?spotify_error=access_denied");
    expect(location).not.toContain("spotify_code");
  });
});
