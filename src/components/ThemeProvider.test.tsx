import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

function TestConsumer() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme("light")}>set-light</button>
      <button onClick={() => setTheme("dark")}>set-dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders children hidden before mount then visible after", async () => {
    const { container } = render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>
    );
    // After useEffect runs, children should be visible
    expect(screen.getByText("child")).toBeInTheDocument();
    // The outer div should not have visibility:hidden after mount
    expect(container.querySelector("[style*='visibility: hidden']")).toBeNull();
  });

  it("defaults to dark when no stored theme and prefers-color-scheme is dark", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("defaults to light when no stored theme and prefers-color-scheme is light", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query !== "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("reads stored theme from localStorage", () => {
    localStorage.setItem("theme", "light");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("toggles theme from light to dark", async () => {
    // matchMedia returns false by default, so initial theme is "light"
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");

    await act(async () => {
      screen.getByText("toggle").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("sets theme directly", async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(async () => {
      screen.getByText("set-light").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");

    await act(async () => {
      screen.getByText("set-dark").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("uses View Transitions API when available", async () => {
    const mockStartViewTransition = vi.fn((cb: () => void) => cb());
    Object.defineProperty(document, "startViewTransition", {
      value: mockStartViewTransition,
      writable: true,
      configurable: true,
    });

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(async () => {
      screen.getByText("set-light").click();
    });
    expect(mockStartViewTransition).toHaveBeenCalled();

    // Clean up
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("toggles theme from dark to light", async () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");

    await act(async () => {
      screen.getByText("toggle").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("ignores invalid stored theme values", () => {
    localStorage.setItem("theme", "invalid");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    // Falls through to matchMedia check (matches false = "light")
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });
});

describe("useTheme outside provider", () => {
  it("returns default values when used outside ThemeProvider", () => {
    function Bare() {
      const { theme } = useTheme();
      return <span>{theme}</span>;
    }
    render(<Bare />);
    expect(screen.getByText("dark")).toBeInTheDocument();
  });
});
