import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createRef } from "react";

vi.mock("@/lib/vestaboard/layout", () => ({
  BOARD_COLS: 3,
}));

vi.mock("@/lib/vestaboard/charset", () => ({
  codeToChar: vi.fn((code: number) => String.fromCharCode(65 + code)),
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

import SplitFlapRow, {
  type SplitFlapRowRef,
} from "@/components/display/SplitFlapRow";

describe("SplitFlapRow", () => {
  it("renders the correct number of tiles", () => {
    const { container } = render(
      <SplitFlapRow ref={createRef()} rowIndex={0} codes={[0, 1, 2]} />
    );
    const tiles = container.querySelectorAll("[data-col]");
    expect(tiles.length).toBe(3);
  });

  it("exposes getTileRef via ref", () => {
    const ref = createRef<SplitFlapRowRef>();
    render(<SplitFlapRow ref={ref} rowIndex={0} codes={[0, 1, 2]} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current!.getTileRef).toBe("function");
  });

  it("getTileRef returns tile ref for valid column", () => {
    const ref = createRef<SplitFlapRowRef>();
    render(<SplitFlapRow ref={ref} rowIndex={0} codes={[0, 1, 2]} />);
    const tileRef = ref.current!.getTileRef(0);
    expect(tileRef).toBeTruthy();
    expect(typeof tileRef!.getCurrentCode).toBe("function");
    expect(typeof tileRef!.flipTo).toBe("function");
  });

  it("getTileRef returns null for invalid column", () => {
    const ref = createRef<SplitFlapRowRef>();
    render(<SplitFlapRow ref={ref} rowIndex={0} codes={[0, 1, 2]} />);
    const tileRef = ref.current!.getTileRef(99);
    expect(tileRef).toBeNull();
  });

  it("handles empty codes array", () => {
    const { container } = render(
      <SplitFlapRow ref={createRef()} rowIndex={0} codes={[]} />
    );
    // Still renders BOARD_COLS tiles, just with code 0 (fallback)
    const tiles = container.querySelectorAll("[data-col]");
    expect(tiles.length).toBe(3);
  });
});
