import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: (props: Record<string, unknown>) => (
    <svg data-testid="qrcode-svg" {...props} />
  ),
}));

import QRCode from "@/components/QRCode";

describe("QRCode", () => {
  it("renders with default size", () => {
    const { container } = render(<QRCode url="https://example.com" />);
    const svg = screen.getByTestId("qrcode-svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("value", "https://example.com");
    expect(svg).toHaveAttribute("size", "120");
    expect(container.firstChild).toHaveStyle({ padding: "8px" });
  });

  it("renders with custom size", () => {
    render(<QRCode url="https://test.com" size={200} />);
    const svg = screen.getByTestId("qrcode-svg");
    expect(svg).toHaveAttribute("size", "200");
    expect(svg).toHaveAttribute("value", "https://test.com");
  });

  it("passes correct color props", () => {
    render(<QRCode url="https://example.com" />);
    const svg = screen.getByTestId("qrcode-svg");
    expect(svg).toHaveAttribute("bgColor", "#ffffff");
    expect(svg).toHaveAttribute("fgColor", "#000000");
    expect(svg).toHaveAttribute("level", "M");
  });
});
