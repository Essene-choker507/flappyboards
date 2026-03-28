import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFullscreen } from "@/hooks/useFullscreen";

describe("useFullscreen", () => {
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;
  let mockExitFullscreen: ReturnType<typeof vi.fn>;
  let mockWakeLockRequest: ReturnType<typeof vi.fn>;
  let mockWakeLockRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    mockWakeLockRelease = vi.fn().mockResolvedValue(undefined);
    mockWakeLockRequest = vi.fn().mockResolvedValue({
      release: mockWakeLockRelease,
    });

    // Mock document.documentElement.requestFullscreen
    document.documentElement.requestFullscreen = mockRequestFullscreen;

    // Mock document.exitFullscreen
    document.exitFullscreen = mockExitFullscreen;

    // Mock fullscreenElement
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: null,
    });

    // Mock navigator.wakeLock
    Object.defineProperty(navigator, "wakeLock", {
      writable: true,
      configurable: true,
      value: { request: mockWakeLockRequest },
    });

    // Mock document.visibilityState
    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requestFullscreen calls document.documentElement.requestFullscreen", async () => {
    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.requestFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();
  });

  it("requestFullscreen requests wake lock", async () => {
    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.requestFullscreen();
    });

    expect(mockWakeLockRequest).toHaveBeenCalledWith("screen");
  });

  it("requestFullscreen handles fullscreen error gracefully", async () => {
    mockRequestFullscreen.mockRejectedValue(new Error("not allowed"));

    const { result } = renderHook(() => useFullscreen());

    // Should not throw
    await act(async () => {
      await result.current.requestFullscreen();
    });

    // Wake lock should still be attempted
    expect(mockWakeLockRequest).toHaveBeenCalled();
  });

  it("requestFullscreen handles wake lock error gracefully", async () => {
    mockWakeLockRequest.mockRejectedValue(new Error("not supported"));

    const { result } = renderHook(() => useFullscreen());

    // Should not throw
    await act(async () => {
      await result.current.requestFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();
  });

  it("requestFullscreen skips wake lock when not available", async () => {
    Object.defineProperty(navigator, "wakeLock", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.requestFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();
    // No error thrown, wake lock just skipped
  });

  it("exitFullscreen calls document.exitFullscreen when in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.exitFullscreen();
    });

    expect(mockExitFullscreen).toHaveBeenCalled();
  });

  it("exitFullscreen does not call document.exitFullscreen when not in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: null,
    });

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.exitFullscreen();
    });

    expect(mockExitFullscreen).not.toHaveBeenCalled();
  });

  it("exitFullscreen releases wake lock if held", async () => {
    const { result } = renderHook(() => useFullscreen());

    // First, acquire wake lock
    await act(async () => {
      await result.current.requestFullscreen();
    });

    // Then exit
    await act(async () => {
      await result.current.exitFullscreen();
    });

    expect(mockWakeLockRelease).toHaveBeenCalled();
  });

  it("exitFullscreen handles exitFullscreen error gracefully", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });
    mockExitFullscreen.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useFullscreen());

    // Should not throw
    await act(async () => {
      await result.current.exitFullscreen();
    });
  });

  it("re-acquires wake lock on visibility change when in fullscreen", async () => {
    renderHook(() => useFullscreen());

    // Simulate: fullscreen is active, no current wake lock, page becomes visible
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockWakeLockRequest).toHaveBeenCalledWith("screen");
  });

  it("does not re-acquire wake lock when not in fullscreen", async () => {
    renderHook(() => useFullscreen());

    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: null,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockWakeLockRequest).not.toHaveBeenCalled();
  });

  it("does not re-acquire wake lock when page is hidden", async () => {
    renderHook(() => useFullscreen());

    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "hidden",
    });
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockWakeLockRequest).not.toHaveBeenCalled();
  });

  it("does not re-acquire wake lock if already held", async () => {
    const { result } = renderHook(() => useFullscreen());

    // Acquire wake lock first
    await act(async () => {
      await result.current.requestFullscreen();
    });

    expect(mockWakeLockRequest).toHaveBeenCalledTimes(1);

    // Now simulate visibility change while wake lock is still held
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should NOT re-acquire since wakeLockRef.current is already set
    expect(mockWakeLockRequest).toHaveBeenCalledTimes(1);
  });

  it("handles wake lock re-acquisition error on visibility change", async () => {
    mockWakeLockRequest.mockRejectedValue(new Error("not supported"));

    renderHook(() => useFullscreen());

    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    // Should not throw
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  });

  it("handles visibility change when wakeLock is not in navigator", async () => {
    Object.defineProperty(navigator, "wakeLock", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    renderHook(() => useFullscreen());

    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    // Should not throw
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  });

  it("requestFullscreen skips wake lock when navigator.wakeLock is missing (deleted)", async () => {
    // Completely remove the wakeLock property
    const desc = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).wakeLock;

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.requestFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();
    // Restore
    if (desc) {
      Object.defineProperty(navigator, "wakeLock", desc);
    }
  });

  it("visibility handler skips wake lock when navigator.wakeLock is missing (deleted)", async () => {
    // Start with wake lock available, then remove it
    const { result } = renderHook(() => useFullscreen());

    // Remove wakeLock from navigator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).wakeLock;

    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      configurable: true,
      value: document.documentElement,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should not throw and should not call request
    // Restore
    Object.defineProperty(navigator, "wakeLock", {
      writable: true,
      configurable: true,
      value: { request: mockWakeLockRequest },
    });
  });

  it("removes visibilitychange listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useFullscreen());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
