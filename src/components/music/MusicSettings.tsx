"use client";

import { useState } from "react";
import { useMusicStore } from "@/stores/music-store";
import type { MusicSource } from "@/stores/music-store";
import StationPicker from "./StationPicker";

export default function MusicSettings() {
  const {
    source,
    setSource,
    musicVolume,
    setMusicVolume,
    lastfmUsername,
    setLastfmUsername,
    currentTrack,
    isPlaying,
  } = useMusicStore();
  const [usernameInput, setUsernameInput] = useState(lastfmUsername || "");

  return (
    <div>
      {/* Source toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {(["off", "radio", "lastfm", "spotify"] as const satisfies readonly MusicSource[]).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "var(--font-geist-mono)",
              background: source === s ? "var(--fg)" : "var(--tag-bg)",
              color: source === s ? "var(--bg)" : "var(--text-subtle)",
              border: "1px solid var(--border)",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
          >
            {s === "lastfm" ? "LAST.FM" : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Radio station picker */}
      {source === "radio" && <StationPicker />}

      {/* Last.fm username input */}
      {source === "lastfm" && (
        <div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && usernameInput.trim()) {
                  setLastfmUsername(usernameInput.trim());
                }
              }}
              placeholder="LAST.FM USERNAME"
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: 8,
                fontFamily: "var(--font-geist-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "var(--tag-bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (usernameInput.trim()) {
                  setLastfmUsername(usernameInput.trim());
                }
              }}
              disabled={!usernameInput.trim()}
              style={{
                padding: "8px 12px",
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: "0.1em",
                fontFamily: "var(--font-geist-mono)",
                background: usernameInput.trim() ? "var(--fg)" : "var(--tag-bg)",
                color: usernameInput.trim() ? "var(--bg)" : "var(--text-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                cursor: usernameInput.trim() ? "pointer" : "default",
                transition: "all 200ms ease",
              }}
            >
              CONNECT
            </button>
          </div>
          {lastfmUsername && (
            <p
              style={{
                fontSize: 7,
                color: "var(--text-subtle)",
                margin: "8px 0 0",
                fontFamily: "var(--font-geist-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.8,
              }}
            >
              {isPlaying && currentTrack
                ? `${currentTrack.artist} — ${currentTrack.title}`
                : "WAITING FOR SCROBBLE..."}
            </p>
          )}
        </div>
      )}

      {/* Spotify placeholder */}
      {source === "spotify" && (
        <div
          style={{
            padding: 16,
            textAlign: "center",
            border: "1px solid var(--border)",
            borderRadius: 2,
          }}
        >
          <p
            style={{
              fontSize: 8,
              color: "var(--text)",
              margin: 0,
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            SPOTIFY INTEGRATION
          </p>
          <p
            style={{
              fontSize: 7,
              color: "var(--text)",
              margin: "6px 0 0",
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            COMING SOON — REQUIRES PREMIUM
          </p>
        </div>
      )}

      {/* Last.fm hint — volume is controlled externally */}
      {source === "lastfm" && (
        <p
          style={{
            fontSize: 7,
            color: "var(--text)",
            margin: "12px 0 0",
            fontFamily: "var(--font-geist-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          VOLUME IS CONTROLLED ON THE DEVICE THAT YOU&apos;RE SCROBBLING FROM
        </p>
      )}

      {/* Music volume (when radio or spotify active) */}
      {source !== "off" && source !== "lastfm" && (
        <div style={{ marginTop: 12 }}>
          <p
            style={{
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              margin: "0 0 8px",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            MUSIC VOLUME — {Math.round(musicVolume * 100)}%
          </p>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            style={{
              width: "100%",
              height: 2,
              appearance: "none",
              background: "var(--border)",
              borderRadius: 1,
              outline: "none",
              cursor: "pointer",
              accentColor: "var(--fg)",
            }}
          />
        </div>
      )}
    </div>
  );
}
