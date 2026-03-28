"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMusicStore } from "@/stores/music-store";

const POLL_INTERVAL = 10_000; // 10 seconds

export function useLastFmPlayer() {
  const {
    source,
    lastfmUsername,
    setPlaying,
    setCurrentTrack,
  } = useMusicStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const poll = useCallback(async () => {
    if (!activeRef.current || !lastfmUsername) return;

    try {
      const res = await fetch(
        `/api/lastfm/now-playing?user=${encodeURIComponent(lastfmUsername)}`
      );
      if (!res.ok) return;

      const data = await res.json();
      setPlaying(data.isPlaying);
      setCurrentTrack(
        data.track ? { title: data.track.title, artist: data.track.artist } : null
      );
    } catch {
      // Silently ignore fetch errors — will retry next interval
    }
  }, [lastfmUsername, setPlaying, setCurrentTrack]);

  useEffect(() => {
    if (source !== "lastfm" || !lastfmUsername) {
      activeRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    activeRef.current = true;

    // Poll immediately on activation
    poll();

    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      activeRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [source, lastfmUsername, poll]);
}
