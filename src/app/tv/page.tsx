"use client";

import { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SplitFlapBoard, {
  type SplitFlapBoardRef,
} from "@/components/display/SplitFlapBoard";
import DisplayOverlay from "@/components/display/DisplayOverlay";
import { formatLines, createEmptyBoard } from "@/lib/vestaboard/message-formatter";
import { useResponsiveScale } from "@/hooks/useResponsiveScale";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { ContentRotator } from "@/lib/content/content-rotator";
import { QUOTES } from "@/lib/content/quotes";
import { decodeConfig } from "@/lib/config/url-config";
import { useTheme } from "@/components/ThemeProvider";
import { useRoomStore } from "@/stores/room-store";
import { usePartyConnection } from "@/hooks/usePartyConnection";
import RoomCode from "@/components/room/RoomCode";
import { useMusicStore } from "@/stores/music-store";
import { useLastFmPlayer } from "@/hooks/useLastFmPlayer";
import { formatNowPlaying } from "@/lib/content/now-playing";

function TVDisplay() {
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();

  // Decode config from URL
  const configParam = searchParams.get("config");
  const configRef = useRef(decodeConfig(configParam || ""));
  const [settings, setSettings] = useState(configRef.current);

  const boardRef = useRef<SplitFlapBoardRef>(null);
  const [initialBoard] = useState(() => createEmptyBoard());
  const isTransitioningRef = useRef(false);
  const scale = useResponsiveScale();
  const { audioEngine } = useAudioEngine();
  const rotatorRef = useRef(new ContentRotator(QUOTES));
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const rotationCountRef = useRef(0);

  // Music state
  const musicSource = useMusicStore((s) => s.source);
  const musicIsPlaying = useMusicStore((s) => s.isPlaying);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const setMusicSource = useMusicStore((s) => s.setSource);
  const setLastfmUsername = useMusicStore((s) => s.setLastfmUsername);

  // Activate Last.fm polling when source is lastfm
  useLastFmPlayer();

  // Generate room code on mount
  const roomCode = useRoomStore((s) => s.roomCode);
  const generateRoomCode = useRoomStore((s) => s.generateRoomCode);

  useEffect(() => {
    if (!roomCode) {
      generateRoomCode();
    }
  }, [roomCode, generateRoomCode]);

  // Apply theme
  useEffect(() => {
    setTheme(settings.theme);
  }, [settings.theme, setTheme]);

  // Request wake lock
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release();
    };
  }, []);

  // Audio from settings
  useEffect(() => {
    if (audioEngine.initialized) {
      audioEngine.setVolume(settings.volume);
      audioEngine.setMuted(settings.isMuted);
    }
  }, [audioEngine, settings.volume, settings.isMuted]);

  const onFlipStep = useCallback(() => {
    if (audioEngine.initialized) {
      audioEngine.playClack(Math.floor(Math.random() * 3));
    }
  }, [audioEngine]);

  const showMessage = useCallback(
    async (lines: string[]) => {
      if (!boardRef.current || isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      const target = formatLines(lines);
      await boardRef.current.transitionTo(target, settings.flipSpeed, settings.staggerDelay, onFlipStep);
      isTransitioningRef.current = false;
    },
    [settings.flipSpeed, settings.staggerDelay, onFlipStep]
  );

  const cycleNext = useCallback(async () => {
    rotationCountRef.current++;
    // Every 3rd rotation, show "Now Playing" if music is active
    if (
      musicIsPlaying &&
      musicSource !== "off" &&
      currentTrack &&
      rotationCountRef.current % 3 === 0
    ) {
      const npLines = formatNowPlaying(currentTrack.title, currentTrack.artist);
      await showMessage(npLines);
      return;
    }
    const content = rotatorRef.current.next();
    await showMessage(content.lines);
  }, [showMessage, musicIsPlaying, musicSource, currentTrack]);

  // Reset rotation timer
  const resetRotation = useCallback(() => {
    clearInterval(rotationTimerRef.current);
    rotationTimerRef.current = setInterval(() => {
      if (!isTransitioningRef.current) cycleNext();
    }, settings.rotationInterval * 1000);
  }, [cycleNext, settings.rotationInterval]);

  // PartyKit connection as host
  const { connectedDevices } = usePartyConnection(roomCode, true, {
    onSettingsChange: (incoming) => {
      setSettings((prev) => ({ ...prev, ...incoming }));
      if (incoming.theme) setTheme(incoming.theme);
      resetRotation();
    },
    onContentChange: (lines) => {
      showMessage(lines);
      resetRotation();
    },
    onSkip: () => {
      cycleNext();
      resetRotation();
    },
    onMusicUpdate: (state) => {
      const ms = state as {
        source: "off" | "radio" | "spotify" | "lastfm";
        lastfmUsername?: string | null;
      };
      if (ms.source) setMusicSource(ms.source);
      if (ms.lastfmUsername !== undefined) setLastfmUsername(ms.lastfmUsername);
    },
  });

  // Initial message + auto-rotation
  useEffect(() => {
    const startTimeout = setTimeout(() => cycleNext(), 800);
    rotationTimerRef.current = setInterval(() => {
      if (!isTransitioningRef.current) cycleNext();
    }, settings.rotationInterval * 1000);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(rotationTimerRef.current);
    };
  }, [cycleNext, settings.rotationInterval]);

  const handleFirstClick = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return (
    <>
      <DisplayOverlay />
      {/* Back button — top left */}
      <a
        href="/"
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: 30,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg)",
          textDecoration: "none",
          opacity: 0.4,
          transition: "opacity 200ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
        title="Back to home"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </a>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          cursor: "pointer",
          position: "relative",
          zIndex: 5,
        }}
        onClick={() => {
          handleFirstClick();
          if (!isTransitioningRef.current) cycleNext();
        }}
      >
        <SplitFlapBoard ref={boardRef} initialBoard={initialBoard} />
      </div>

      {roomCode && (
        <RoomCode code={roomCode} connectedDevices={connectedDevices} />
      )}
    </>
  );
}

export default function TVPage() {
  return (
    <Suspense>
      <TVDisplay />
    </Suspense>
  );
}
