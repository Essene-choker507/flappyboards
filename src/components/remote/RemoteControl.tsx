"use client";

import { useState, useCallback, useEffect } from "react";

interface RemoteSettings {
  flipSpeed: number;
  staggerDelay: number;
  rotationInterval: number;
  volume: number;
  isMuted: boolean;
  theme: "dark" | "light";
}

interface RemoteControlProps {
  settings: RemoteSettings;
  roomCode: string;
  connectedDevices: number;
  onSendMessage: (msg: object) => void;
  onDisconnect: () => void;
}

export default function RemoteControl({
  settings,
  roomCode,
  connectedDevices,
  onSendMessage,
  onDisconnect,
}: RemoteControlProps) {
  const [customText, setCustomText] = useState("");
  const [localSettings, setLocalSettings] = useState(settings);
  const [lastfmInput, setLastfmInput] = useState("");
  const [lastfmConnected, setLastfmConnected] = useState(false);

  const updateSetting = useCallback(
    (key: string, value: number | boolean | string) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
      onSendMessage({ type: "settings-update", payload: { [key]: value } });
    },
    [onSendMessage]
  );

  const handleSendCustom = () => {
    if (!customText.trim()) return;
    const lines = customText
      .toUpperCase()
      .split("\n")
      .slice(0, 6)
      .map((l) => l.slice(0, 22));
    while (lines.length < 6) lines.push("");
    onSendMessage({ type: "content-change", payload: { lines } });
    setCustomText("");
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        margin: "0 auto",
        padding: "0 24px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <p style={{ ...labelStyle, fontSize: 12, letterSpacing: "0.3em" }}>FLAPPYBOARDS</p>
        <p style={{ ...labelStyle, color: "var(--text-muted)", marginTop: 4 }}>REMOTE</p>
      </div>

      <div style={{ height: 1, background: "var(--divider)", marginBottom: 20 }} />

      {/* Message */}
      <Section label="MESSAGE">
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="TYPE YOUR MESSAGE..."
          rows={4}
          maxLength={132}
          style={{
            width: "100%",
            background: "var(--tag-bg)",
            border: "1px solid var(--border)",
            borderRadius: 2,
            padding: "10px 12px",
            fontSize: 11,
            fontFamily: "var(--font-geist-mono)",
            color: "var(--text)",
            letterSpacing: "0.04em",
            resize: "none",
            outline: "none",
          }}
        />
        <button onClick={handleSendCustom} disabled={!customText.trim()} style={buttonStyle(!!customText.trim())}>
          SEND
        </button>
      </Section>

      {/* Content */}
      <Section label="CONTENT">
        <button
          onClick={() => onSendMessage({ type: "skip-next" })}
          style={buttonStyle(true)}
        >
          SKIP TO NEXT
        </button>
      </Section>

      {/* Music — Last.fm */}
      <Section label="MUSIC — LAST.FM">
        <p
          style={{
            fontSize: 7,
            color: "var(--text-subtle)",
            margin: "0 0 8px",
            fontFamily: "var(--font-geist-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          SHOW NOW PLAYING FROM ANY APP
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          <input
            type="text"
            value={lastfmInput}
            onChange={(e) => setLastfmInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && lastfmInput.trim()) {
                onSendMessage({
                  type: "music-control",
                  payload: {
                    source: "lastfm",
                    isPlaying: false,
                    currentTrack: null,
                    radioStation: null,
                    lastfmUsername: lastfmInput.trim(),
                  },
                });
                setLastfmConnected(true);
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
              if (lastfmInput.trim()) {
                onSendMessage({
                  type: "music-control",
                  payload: {
                    source: "lastfm",
                    isPlaying: false,
                    currentTrack: null,
                    radioStation: null,
                    lastfmUsername: lastfmInput.trim(),
                  },
                });
                setLastfmConnected(true);
              }
            }}
            disabled={!lastfmInput.trim()}
            style={{
              padding: "8px 12px",
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: "0.1em",
              fontFamily: "var(--font-geist-mono)",
              background: lastfmInput.trim() ? "var(--fg)" : "var(--tag-bg)",
              color: lastfmInput.trim() ? "var(--bg)" : "var(--text-subtle)",
              border: "1px solid var(--border)",
              borderRadius: 2,
              cursor: lastfmInput.trim() ? "pointer" : "default",
              transition: "all 200ms ease",
            }}
          >
            {lastfmConnected ? "UPDATE" : "CONNECT"}
          </button>
        </div>
        {lastfmConnected && (
          <button
            onClick={() => {
              onSendMessage({
                type: "music-control",
                payload: {
                  source: "off",
                  isPlaying: false,
                  currentTrack: null,
                  radioStation: null,
                  lastfmUsername: null,
                },
              });
              setLastfmConnected(false);
              setLastfmInput("");
            }}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "6px 0",
              fontSize: 7,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "var(--font-geist-mono)",
              background: "none",
              color: "#e55",
              border: "1px solid rgba(238, 85, 85, 0.3)",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
          >
            DISCONNECT LAST.FM
          </button>
        )}
      </Section>

      {/* Theme */}
      <Section label="THEME">
        <div style={{ display: "flex", gap: 8 }}>
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateSetting("theme", t)}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
                fontFamily: "var(--font-geist-mono)",
                background: localSettings.theme === t ? "var(--fg)" : "var(--tag-bg)",
                color: localSettings.theme === t ? "var(--bg)" : "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </Section>

      {/* Speed */}
      <Section label={`FLIP SPEED — ${localSettings.flipSpeed}MS`}>
        <RangeInput
          min={80} max={400} step={10}
          value={localSettings.flipSpeed}
          onChange={(v) => updateSetting("flipSpeed", v)}
        />
      </Section>

      {/* Stagger */}
      <Section label={`STAGGER — ${localSettings.staggerDelay}MS`}>
        <RangeInput
          min={5} max={80} step={5}
          value={localSettings.staggerDelay}
          onChange={(v) => updateSetting("staggerDelay", v)}
        />
      </Section>

      {/* Rotation */}
      <Section label={`ROTATION — ${localSettings.rotationInterval}S`}>
        <RangeInput
          min={5} max={120} step={5}
          value={localSettings.rotationInterval}
          onChange={(v) => updateSetting("rotationInterval", v)}
        />
      </Section>

      {/* Volume */}
      <Section label={`VOLUME — ${Math.round(localSettings.volume * 100)}%`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <RangeInput
              min={0} max={1} step={0.05}
              value={localSettings.volume}
              onChange={(v) => updateSetting("volume", v)}
            />
          </div>
          <button
            onClick={() => updateSetting("isMuted", !localSettings.isMuted)}
            style={{
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              fontFamily: "var(--font-geist-mono)",
              padding: "4px 8px",
              borderRadius: 2,
              background: localSettings.isMuted ? "var(--fg)" : "var(--tag-bg)",
              color: localSettings.isMuted ? "var(--bg)" : "var(--text-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
          >
            {localSettings.isMuted ? "UNMUTE" : "MUTE"}
          </button>
        </div>
      </Section>

      {/* Connection */}
      <Section label="CONNECTION">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span style={{ ...labelStyle, color: "var(--text-subtle)" }}>
            ROOM {roomCode}
          </span>
          <span style={{ ...labelStyle, color: "var(--text-subtle)" }}>
            {connectedDevices} DEVICE{connectedDevices !== 1 ? "S" : ""}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          style={{
            width: "100%",
            padding: "8px 0",
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "var(--font-geist-mono)",
            background: "none",
            color: "#e55",
            border: "1px solid rgba(238, 85, 85, 0.3)",
            borderRadius: 2,
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
        >
          DISCONNECT
        </button>
      </Section>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 500,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  margin: 0,
  fontFamily: "var(--font-geist-mono)",
};

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 0",
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    fontFamily: "var(--font-geist-mono)",
    background: active ? "var(--fg)" : "var(--tag-bg)",
    color: active ? "var(--bg)" : "var(--text-subtle)",
    border: "1px solid var(--border)",
    borderRadius: 2,
    cursor: active ? "pointer" : "default",
    transition: "all 200ms ease",
    marginTop: 8,
  };
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ ...labelStyle, margin: "0 0 10px" }}>{label}</p>
      {children}
    </div>
  );
}

function RangeInput({
  min, max, step, value, onChange,
}: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
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
  );
}
