import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/vestaboard/layout", () => ({
  BOARD_ROWS: 6,
  BOARD_COLS: 22,
}));

import { useResponsiveScale } from "@/hooks/useResponsiveScale";

describe("useResponsiveScale", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    // Default: large screen
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 1080,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    vi.restoreAllMocks();
  });

  it("calculates initial scale based on window size", () => {
    const { result } = renderHook(() => useResponsiveScale());

    // BOARD_COLS=22, TILE_WIDTH=48, TILE_GAP=3, BOARD_PADDING_X=40
    // boardWidth = 22*48 + 21*3 + 40 = 1056 + 63 + 40 = 1159
    // BOARD_ROWS=6, TILE_HEIGHT=64, BOARD_PADDING_Y=32
    // boardHeight = 6*64 + 5*3 + 32 = 384 + 15 + 32 = 431
    // scaleX = (1920 * 0.95) / 1159 = 1824 / 1159 ~= 1.5737
    // scaleY = (1080 * 0.9) / 431 = 972 / 431 ~= 2.2551
    // scale = min(scaleX, scaleY) ~= 1.5737
    expect(result.current).toBeCloseTo(1.5737, 2);
  });

  it("updates scale on window resize", () => {
    const { result } = renderHook(() => useResponsiveScale());

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 800,
      });
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: 600,
      });
      window.dispatchEvent(new Event("resize"));
    });

    // scaleX = (800 * 0.95) / 1159 = 760 / 1159 ~= 0.6558
    // scaleY = (600 * 0.9) / 431 = 540 / 431 ~= 1.2529
    // scale = min(0.6558, 1.2529) ~= 0.6558
    expect(result.current).toBeCloseTo(0.6558, 2);
  });

  it("uses height constraint when width is much larger", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 3840,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 400,
    });

    const { result } = renderHook(() => useResponsiveScale());

    // scaleX = (3840 * 0.95) / 1159 ~= 3.147
    // scaleY = (400 * 0.9) / 431 ~= 0.835
    // scale = min(3.147, 0.835) ~= 0.835
    expect(result.current).toBeCloseTo(0.835, 2);
  });

  it("removes resize listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useResponsiveScale());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
