import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCastSession } from "@/hooks/useCastSession";

describe("useCastSession", () => {
  let mockStart: ReturnType<typeof vi.fn>;
  let mockTerminate: ReturnType<typeof vi.fn>;
  let connectionListeners: Record<string, (() => void)[]>;

  beforeEach(() => {
    connectionListeners = {};
    mockTerminate = vi.fn();
    const mockConnection = {
      terminate: mockTerminate,
      addEventListener: vi.fn(
        (event: string, handler: () => void) => {
          if (!connectionListeners[event]) connectionListeners[event] = [];
          connectionListeners[event].push(handler);
        }
      ),
    };

    mockStart = vi.fn().mockResolvedValue(mockConnection);

    // Use function keyword so it works as a constructor with `new`
    const MockPresentationRequest = vi.fn(function () {
      return { start: mockStart };
    });

    Object.defineProperty(window, "PresentationRequest", {
      writable: true,
      configurable: true,
      value: MockPresentationRequest,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects PresentationRequest availability", () => {
    const { result } = renderHook(() => useCastSession());
    expect(result.current.isAvailable).toBe(true);
  });

  it("detects PresentationRequest not available", () => {
    // Delete the property entirely so `"PresentationRequest" in window` is false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).PresentationRequest;

    const { result } = renderHook(() => useCastSession());
    expect(result.current.isAvailable).toBe(false);
  });

  it("starts casting and sets connected state", async () => {
    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com");
    });

    expect(mockStart).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it("does nothing when startCasting is called and not available", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).PresentationRequest;

    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com");
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("handles startCasting error gracefully", async () => {
    mockStart.mockRejectedValue(new Error("User cancelled"));

    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com");
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("sets isConnected to false on close event", async () => {
    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com");
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      connectionListeners["close"]?.forEach((cb) => cb());
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("sets isConnected to false on terminate event", async () => {
    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com");
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      connectionListeners["terminate"]?.forEach((cb) => cb());
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("stopCasting terminates connection and resets state", async () => {
    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com");
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.stopCasting();
    });

    expect(mockTerminate).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it("stopCasting does nothing when not connected", () => {
    const { result } = renderHook(() => useCastSession());

    act(() => {
      result.current.stopCasting();
    });

    expect(mockTerminate).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it("creates PresentationRequest with correct URL", async () => {
    const { result } = renderHook(() => useCastSession());

    await act(async () => {
      await result.current.startCasting("https://tv.example.com/display");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).PresentationRequest).toHaveBeenCalledWith([
      "https://tv.example.com/display",
    ]);
  });

  it("returns initial state correctly", () => {
    const { result } = renderHook(() => useCastSession());

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(typeof result.current.startCasting).toBe("function");
    expect(typeof result.current.stopCasting).toBe("function");
  });
});
