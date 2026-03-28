import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

import Home from "@/app/page";

describe("Home page", () => {
  it("renders the landing page", () => {
    render(<Home />);
    expect(screen.getByText("FLAPPYBOARDS")).toBeInTheDocument();
    expect(screen.getByText("BY COZY")).toBeInTheDocument();
  });

  it("renders theme toggle", () => {
    render(<Home />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("renders tagline", () => {
    render(<Home />);
    expect(
      screen.getByText("TURN ANY TV INTO A RETRO SPLIT-FLAP DISPLAY")
    ).toBeInTheDocument();
  });

  it("renders launch display link", () => {
    render(<Home />);
    const link = screen.getByText("LAUNCH DISPLAY");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/display");
  });

  it("renders github link", () => {
    render(<Home />);
    const link = screen.getByText("GITHUB");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://github.com/vxcozy/flappyboards"
    );
  });

  it("renders footer", () => {
    render(<Home />);
    expect(screen.getByText(/MADE WITH/)).toBeInTheDocument();
  });

  it("renders social links", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll('a[target="_blank"]');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("renders mock board tiles", () => {
    const { container } = render(<Home />);
    // 6 rows * 22 cols = 132 tiles
    const tiles = container.querySelectorAll(
      '[style*="aspect-ratio: 3 / 4"]'
    );
    expect(tiles.length).toBe(132);
  });

  it("handles hover effects on launch display link", () => {
    render(<Home />);
    const link = screen.getByText("LAUNCH DISPLAY");
    fireEvent.mouseEnter(link);
    expect(link.style.transform).toBe("translateY(-2px)");
    fireEvent.mouseLeave(link);
    expect(link.style.transform).toBe("translateY(0)");
  });

  it("handles hover effects on github link", () => {
    render(<Home />);
    const link = screen.getByText("GITHUB").closest("a")!;
    fireEvent.mouseEnter(link);
    expect(link.style.color).toBe("var(--fg)");
    expect(link.style.transform).toBe("scale(1.05)");
    fireEvent.mouseLeave(link);
    expect(link.style.color).toBe("var(--text-muted)");
    expect(link.style.transform).toBe("scale(1)");
  });

  it("renders tiles with both characters and empty strings", () => {
    const { container } = render(<Home />);
    const tiles = container.querySelectorAll('[style*="aspect-ratio: 3 / 4"]');
    // Some tiles should have text (non-space characters), some should be empty
    let hasText = false;
    let hasEmpty = false;
    tiles.forEach((tile) => {
      if (tile.textContent && tile.textContent.trim().length > 0) {
        hasText = true;
      } else {
        hasEmpty = true;
      }
    });
    expect(hasText).toBe(true);
    expect(hasEmpty).toBe(true);
  });

  it("renders the launch display link with proper initial styles", () => {
    render(<Home />);
    const link = screen.getByText("LAUNCH DISPLAY");
    expect(link.style.transform).toBe("translateY(0)");
    expect(link.style.boxShadow).toBe("none");
  });
});
