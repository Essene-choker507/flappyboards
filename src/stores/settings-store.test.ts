import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settings-store";

describe("useSettingsStore", () => {
  beforeEach(() => {
    // Reset to initial state before each test
    useSettingsStore.setState({
      flipSpeed: 200,
      staggerDelay: 20,
      rotationInterval: 15,
      volume: 0.7,
      isMuted: false,
    });
  });

  it("has correct initial state", () => {
    const state = useSettingsStore.getState();
    expect(state.flipSpeed).toBe(200);
    expect(state.staggerDelay).toBe(20);
    expect(state.rotationInterval).toBe(15);
    expect(state.volume).toBe(0.7);
    expect(state.isMuted).toBe(false);
  });

  it("setFlipSpeed updates flipSpeed", () => {
    useSettingsStore.getState().setFlipSpeed(300);
    expect(useSettingsStore.getState().flipSpeed).toBe(300);
  });

  it("setStaggerDelay updates staggerDelay", () => {
    useSettingsStore.getState().setStaggerDelay(50);
    expect(useSettingsStore.getState().staggerDelay).toBe(50);
  });

  it("setRotationInterval updates rotationInterval", () => {
    useSettingsStore.getState().setRotationInterval(30);
    expect(useSettingsStore.getState().rotationInterval).toBe(30);
  });

  it("setVolume updates volume", () => {
    useSettingsStore.getState().setVolume(0.3);
    expect(useSettingsStore.getState().volume).toBe(0.3);
  });

  it("setMuted updates isMuted to true", () => {
    useSettingsStore.getState().setMuted(true);
    expect(useSettingsStore.getState().isMuted).toBe(true);
  });

  it("setMuted updates isMuted to false", () => {
    useSettingsStore.getState().setMuted(true);
    useSettingsStore.getState().setMuted(false);
    expect(useSettingsStore.getState().isMuted).toBe(false);
  });

  it("setVolume to 0", () => {
    useSettingsStore.getState().setVolume(0);
    expect(useSettingsStore.getState().volume).toBe(0);
  });

  it("setVolume to 1", () => {
    useSettingsStore.getState().setVolume(1);
    expect(useSettingsStore.getState().volume).toBe(1);
  });
});
