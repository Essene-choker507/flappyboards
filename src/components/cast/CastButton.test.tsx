import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockStartCasting = vi.fn();
const mockStopCasting = vi.fn();
const mockCastState = {
  isAvailable: true,
  isConnected: false,
};

vi.mock("@/hooks/useCastSession", () => ({
  useCastSession: () => ({
    ...mockCastState,
    startCasting: mockStartCasting,
    stopCasting: mockStopCasting,
  }),
}));

import CastButton from "@/components/cast/CastButton";

describe("CastButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCastState.isAvailable = true;
    mockCastState.isConnected = false;
  });

  it("returns null when cast is not available", () => {
    mockCastState.isAvailable = false;
    const { container } = render(<CastButton tvUrl="https://tv.test" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders CAST TO TV when not connected", () => {
    render(<CastButton tvUrl="https://tv.test" />);
    expect(screen.getByText("CAST TO TV")).toBeInTheDocument();
  });

  it("renders STOP CASTING when connected", () => {
    mockCastState.isConnected = true;
    render(<CastButton tvUrl="https://tv.test" />);
    expect(screen.getByText("STOP CASTING")).toBeInTheDocument();
  });

  it("calls startCasting with tvUrl when not connected and clicked", () => {
    render(<CastButton tvUrl="https://tv.test" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockStartCasting).toHaveBeenCalledWith("https://tv.test");
  });

  it("calls stopCasting when connected and clicked", () => {
    mockCastState.isConnected = true;
    render(<CastButton tvUrl="https://tv.test" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockStopCasting).toHaveBeenCalled();
  });

  it("applies custom style prop", () => {
    render(
      <CastButton tvUrl="https://tv.test" style={{ width: "100%" }} />
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveStyle({ width: "100%" });
  });

  it("renders SVG cast icon", () => {
    const { container } = render(<CastButton tvUrl="https://tv.test" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
