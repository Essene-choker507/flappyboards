import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createRef } from "react";

vi.mock("@/lib/vestaboard/charset", () => ({
  codeToChar: vi.fn((code: number) =>
    code === 0 ? " " : String.fromCharCode(64 + code)
  ),
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

import SplitFlapTile, {
  type SplitFlapTileRef,
} from "@/components/display/SplitFlapTile";

describe("SplitFlapTile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders with initial character", () => {
    const { container } = render(
      <SplitFlapTile ref={createRef()} initialCode={1} row={0} col={0} />
    );
    const tile = container.querySelector("[data-row='0'][data-col='0']");
    expect(tile).toBeInTheDocument();
    // Contains character displays
    const charDisplays = container.querySelectorAll(".charDisplay");
    expect(charDisplays.length).toBe(4); // topHalf, bottomHalf, flapFront, flapBack
  });

  it("exposes getCurrentCode via ref", () => {
    const ref = createRef<SplitFlapTileRef>();
    render(<SplitFlapTile ref={ref} initialCode={5} row={0} col={0} />);
    expect(ref.current!.getCurrentCode()).toBe(5);
  });

  it("flipTo resolves and updates current code", async () => {
    const ref = createRef<SplitFlapTileRef>();
    render(<SplitFlapTile ref={ref} initialCode={0} row={0} col={0} />);

    let resolved = false;
    act(() => {
      ref.current!.flipTo(3, 100).then(() => {
        resolved = true;
      });
    });

    // Advance through half duration and full duration
    await act(async () => {
      vi.advanceTimersByTime(50); // halfDuration
    });
    await act(async () => {
      vi.advanceTimersByTime(50); // remaining duration
    });

    expect(resolved).toBe(true);
    expect(ref.current!.getCurrentCode()).toBe(3);
  });

  it("flipTo resolves immediately if already flipping", async () => {
    const ref = createRef<SplitFlapTileRef>();
    render(<SplitFlapTile ref={ref} initialCode={0} row={0} col={0} />);

    // Start first flip
    act(() => {
      ref.current!.flipTo(1, 200);
    });

    // Attempt second flip while first is in progress
    let secondResolved = false;
    await act(async () => {
      ref.current!.flipTo(2, 200).then(() => {
        secondResolved = true;
      });
    });

    expect(secondResolved).toBe(true);
    // Complete first flip
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
  });

  it("flipTo sets CSS transitions and transforms during animation", async () => {
    const ref = createRef<SplitFlapTileRef>();
    const { container } = render(
      <SplitFlapTile ref={ref} initialCode={0} row={0} col={0} />
    );

    act(() => {
      ref.current!.flipTo(3, 100);
    });

    // After starting the flip, flapFront should have been transformed
    const flapFront = container.querySelector(".flapFront") as HTMLElement;
    expect(flapFront.style.transform).toBe("rotateX(-90deg)");
    expect(flapFront.style.willChange).toBe("transform, box-shadow");

    // Advance to midpoint (halfDuration = 50ms)
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    // After midpoint, flapBack should be animating
    const flapBack = container.querySelector(".flapBack") as HTMLElement;
    expect(flapBack.style.transform).toBe("rotateX(0deg)");

    // Advance to completion
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    // After completion, will-change should be reset to "auto"
    expect(flapFront.style.willChange).toBe("auto");
    expect(flapBack.style.willChange).toBe("auto");
    expect(ref.current!.getCurrentCode()).toBe(3);
  });

  it("sets data-row and data-col attributes", () => {
    const { container } = render(
      <SplitFlapTile ref={createRef()} initialCode={0} row={3} col={7} />
    );
    const tile = container.querySelector("[data-row='3'][data-col='7']");
    expect(tile).toBeInTheDocument();
  });

  it("renders all four flap elements", () => {
    const { container } = render(
      <SplitFlapTile ref={createRef()} initialCode={0} row={0} col={0} />
    );
    expect(container.querySelector(".topHalf")).toBeInTheDocument();
    expect(container.querySelector(".bottomHalf")).toBeInTheDocument();
    expect(container.querySelector(".flapFront")).toBeInTheDocument();
    expect(container.querySelector(".flapBack")).toBeInTheDocument();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
