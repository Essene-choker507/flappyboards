import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DisplayOverlay from "@/components/display/DisplayOverlay";

describe("DisplayOverlay", () => {
  it("renders a fixed overlay div", () => {
    const { container } = render(<DisplayOverlay />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ position: "fixed" });
    expect(overlay).toHaveStyle({ pointerEvents: "none" });
    expect(overlay).toHaveStyle({ zIndex: 10 });
    expect(overlay).toHaveStyle({ opacity: "0.5" });
  });

  it("has inset 0 for full coverage", () => {
    const { container } = render(<DisplayOverlay />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ inset: "0" });
  });
});
