import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockToggleTheme = vi.fn();
const mockTheme = { current: "dark" as string };

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    toggleTheme: mockToggleTheme,
    setTheme: vi.fn(),
  }),
}));

import ThemeToggle from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders moon icon in dark mode", () => {
    mockTheme.current = "dark";
    const { container } = render(<ThemeToggle />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Moon icon has a path element (not circle/line)
    expect(container.querySelector("svg path")).toBeInTheDocument();
    expect(container.querySelectorAll("svg circle")).toHaveLength(0);
  });

  it("renders sun icon in light mode", () => {
    mockTheme.current = "light";
    const { container } = render(<ThemeToggle />);
    // Sun icon has circle and line elements
    expect(container.querySelector("svg circle")).toBeInTheDocument();
    expect(container.querySelectorAll("svg line").length).toBeGreaterThan(0);
  });

  it("calls toggleTheme on click", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it("shows correct aria-label for dark mode", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Switch to light mode"
    );
  });

  it("shows correct aria-label for light mode", () => {
    mockTheme.current = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Switch to dark mode"
    );
  });

  it("applies custom className", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle className="extra" />);
    expect(screen.getByRole("button")).toHaveClass("theme-toggle", "extra");
  });

  it("applies default empty className", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveClass("theme-toggle");
  });
});
