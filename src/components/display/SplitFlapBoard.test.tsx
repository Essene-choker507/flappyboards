import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createRef } from "react";

vi.mock("@/lib/vestaboard/layout", () => ({
  BOARD_ROWS: 2,
  BOARD_COLS: 3,
}));

const mockFlipTo = vi.fn().mockResolvedValue(undefined);
const mockGetCurrentCode = vi.fn().mockReturnValue(0);
let mockTileRefReturnsNull = false;

vi.mock("@/lib/vestaboard/charset", () => ({
  calculateFlipPath: vi.fn((from: number, to: number) => {
    if (from === to) return [];
    return [to];
  }),
  codeToChar: vi.fn((code: number) => String.fromCharCode(65 + code)),
}));

vi.mock("@/styles/board.module.css", () => ({
  default: { boardContainer: "boardContainer", board: "board" },
}));

vi.mock("@/styles/tile.module.css", () => ({
  default: {
    tile: "tile",
    topHalf: "topHalf",
    bottomHalf: "bottomHalf",
    charDisplay: "charDisplay",
    flapFront: "flapFront",
    flapBack: "flapBack",
  },
}));

// Mock SplitFlapRow to expose tile refs we can control
vi.mock("./SplitFlapRow", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return {
    default: forwardRef(function MockRow(_props: Record<string, unknown>, ref: React.Ref<unknown>) {
      useImperativeHandle(ref, () => ({
        getTileRef: () => {
          if (mockTileRefReturnsNull) return null;
          return {
            getCurrentCode: mockGetCurrentCode,
            flipTo: mockFlipTo,
          };
        },
      }));
      return <div data-testid={`row-${_props.rowIndex}`} />;
    }),
  };
});

import SplitFlapBoard, {
  type SplitFlapBoardRef,
} from "@/components/display/SplitFlapBoard";

describe("SplitFlapBoard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFlipTo.mockClear().mockResolvedValue(undefined);
    mockGetCurrentCode.mockClear().mockReturnValue(0);
    mockTileRefReturnsNull = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders rows and tiles based on BOARD_ROWS and BOARD_COLS", () => {
    const board = [
      [0, 1, 2],
      [3, 4, 5],
    ];
    const { container } = render(
      <SplitFlapBoard ref={createRef()} initialBoard={board} />
    );
    expect(container.querySelector(".board")).toBeInTheDocument();
  });

  it("exposes transitionTo via ref", () => {
    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    render(<SplitFlapBoard ref={ref} initialBoard={board} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current!.transitionTo).toBe("function");
  });

  it("handles empty initial board gracefully", () => {
    const { container } = render(
      <SplitFlapBoard ref={createRef()} initialBoard={[]} />
    );
    expect(container.querySelector(".board")).toBeInTheDocument();
  });

  it("transitionTo triggers flipTo on tiles with different target codes", async () => {
    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    render(<SplitFlapBoard ref={ref} initialBoard={board} />);

    const target = [
      [1, 2, 3],
      [4, 5, 6],
    ];

    await act(async () => {
      // Use short stagger delay to speed up test
      const promise = ref.current!.transitionTo(target, 10, 0);
      // Advance timers to let staggered delays resolve
      vi.advanceTimersByTime(100);
      await promise;
    });

    // Each tile should have been flipped since all codes differ from 0
    expect(mockFlipTo).toHaveBeenCalled();
  });

  it("transitionTo skips tiles where current equals target", async () => {
    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [1, 1, 1],
      [1, 1, 1],
    ];
    // getCurrentCode returns same as target, calculateFlipPath returns []
    mockGetCurrentCode.mockReturnValue(1);

    render(<SplitFlapBoard ref={ref} initialBoard={board} />);

    const target = [
      [1, 1, 1],
      [1, 1, 1],
    ];

    await act(async () => {
      await ref.current!.transitionTo(target, 10, 0);
    });

    // No flips needed since all are already at target
    expect(mockFlipTo).not.toHaveBeenCalled();
  });

  it("transitionTo calls onFlipStep callback for each flip", async () => {
    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    render(<SplitFlapBoard ref={ref} initialBoard={board} />);

    const target = [
      [1, 0, 0],
      [0, 0, 0],
    ];

    const onFlipStep = vi.fn();

    await act(async () => {
      const promise = ref.current!.transitionTo(target, 10, 0, onFlipStep);
      vi.advanceTimersByTime(100);
      await promise;
    });

    expect(onFlipStep).toHaveBeenCalled();
  });

  it("transitionTo handles null tileRef gracefully", async () => {
    mockTileRefReturnsNull = true;

    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    render(<SplitFlapBoard ref={ref} initialBoard={board} />);

    const target = [
      [1, 2, 3],
      [4, 5, 6],
    ];

    await act(async () => {
      await ref.current!.transitionTo(target, 10, 0);
    });

    // No flips should have been called since tileRef is null
    expect(mockFlipTo).not.toHaveBeenCalled();
  });

  it("transitionTo handles empty flip path (calculateFlipPath returns [])", async () => {
    // The mock calculateFlipPath returns [] when from === to
    // getCurrentCode returns 0, and target is also 0 => currentCode === targetCode => skip
    mockGetCurrentCode.mockReturnValue(5);

    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [5, 5, 5],
      [5, 5, 5],
    ];
    render(<SplitFlapBoard ref={ref} initialBoard={board} />);

    // Target same as current - flipPath will be empty
    const target = [
      [5, 5, 5],
      [5, 5, 5],
    ];

    await act(async () => {
      await ref.current!.transitionTo(target, 10, 0);
    });

    // No flips should have been triggered
    expect(mockFlipTo).not.toHaveBeenCalled();
  });

  it("transitionTo uses default flipSpeed and staggerDelay", async () => {
    const ref = createRef<SplitFlapBoardRef>();
    const board = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    render(<SplitFlapBoard ref={ref} initialBoard={board} />);

    const target = [
      [1, 0, 0],
      [0, 0, 0],
    ];

    await act(async () => {
      const promise = ref.current!.transitionTo(target);
      vi.advanceTimersByTime(5000);
      await promise;
    });

    // flipTo should have been called with default flipSpeed (280)
    expect(mockFlipTo).toHaveBeenCalledWith(expect.any(Number), 280);
  });
});
