import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("geist/font/sans", () => ({
  GeistSans: { variable: "geist-sans-var" },
}));

vi.mock("geist/font/mono", () => ({
  GeistMono: { variable: "geist-mono-var" },
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="analytics" />,
}));

vi.mock("@/components/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

import RootLayout, { metadata, viewport } from "@/app/layout";

describe("RootLayout", () => {
  it("renders children within ThemeProvider", () => {
    render(
      <RootLayout>
        <div>Test Child</div>
      </RootLayout>
    );
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("renders Analytics component", () => {
    render(
      <RootLayout>
        <div>Child</div>
      </RootLayout>
    );
    expect(screen.getByTestId("analytics")).toBeInTheDocument();
  });

  it("exports metadata with correct title", () => {
    expect(metadata.title).toBe(
      "FlappyBoards — Turn any TV into a retro split-flap display"
    );
  });

  it("exports metadata with description", () => {
    expect(metadata.description).toBeTruthy();
  });

  it("exports metadata with openGraph", () => {
    expect(metadata.openGraph).toBeDefined();
  });

  it("exports metadata with twitter card", () => {
    expect(metadata.twitter).toBeDefined();
  });

  it("exports viewport with theme colors", () => {
    expect(viewport.themeColor).toBeDefined();
    expect(Array.isArray(viewport.themeColor)).toBe(true);
  });

  it("exports metadata with keywords", () => {
    expect(metadata.keywords).toBeDefined();
    expect(Array.isArray(metadata.keywords)).toBe(true);
  });
});
