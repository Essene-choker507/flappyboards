import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.LASTFM_API_KEY || "";
const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");

  if (!user) {
    return NextResponse.json(
      { error: "Missing user parameter" },
      { status: 400 }
    );
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Last.fm API key not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    method: "user.getrecenttracks",
    user,
    api_key: API_KEY,
    format: "json",
    limit: "1",
  });

  const res = await fetch(`${LASTFM_BASE}?${params}`, {
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const status = res.status === 404 ? 404 : 502;
    return NextResponse.json(
      { error: status === 404 ? "User not found" : "Last.fm API error" },
      { status }
    );
  }

  const data = await res.json();
  const tracks = data?.recenttracks?.track;

  if (!tracks || tracks.length === 0) {
    return NextResponse.json({ isPlaying: false, track: null });
  }

  const latest = Array.isArray(tracks) ? tracks[0] : tracks;
  const isPlaying = latest["@attr"]?.nowplaying === "true";

  return NextResponse.json({
    isPlaying,
    track: {
      title: latest.name || "Unknown",
      artist: latest.artist?.["#text"] || latest.artist?.name || "Unknown",
    },
  });
}
