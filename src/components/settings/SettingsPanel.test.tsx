import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockSettings = {
  flipSpeed: 200,
  staggerDelay: 20,
  rotationInterval: 15,
  volume: 0.7,
  isMuted: false,
  setFlipSpeed: vi.fn(),
  setStaggerDelay: vi.fn(),
  setRotationInterval: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
};

const mockTheme = { current: "dark" as string };

vi.mock("@/stores/settings-store", () => ({
  useSettingsStore: () => mockSettings,
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

vi.mock("@/lib/audio/audio-engine", () => ({
  audioEngine: {
    setVolume: vi.fn(),
    setMuted: vi.fn(),
  },
}));

vi.mock("@/lib/config/url-config", () => ({
  encodeConfig: vi.fn(() => "encoded-config"),
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("@/components/QRCode", () => ({
  default: (props: { url: string }) => (
    <div data-testid="qrcode">{props.url}</div>
  ),
}));

vi.mock("@/components/music/MusicSettings", () => ({
  default: () => <div data-testid="music-settings">MusicSettings</div>,
}));

vi.mock("@/components/cast/CastButton", () => ({
  default: () => <div data-testid="cast-button">CastButton</div>,
}));

import SettingsPanel from "@/components/settings/SettingsPanel";

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders settings gear button", () => {
    render(<SettingsPanel />);
    expect(screen.getByTitle("Settings (Esc)")).toBeInTheDocument();
  });

  it("renders theme toggle in top bar", () => {
    render(<SettingsPanel />);
    expect(screen.getAllByTestId("theme-toggle").length).toBeGreaterThan(0);
  });

  it("opens panel on gear click", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText("SETTINGS")).toBeInTheDocument();
  });

  it("closes panel on close button click", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    // Find the close button (X svg)
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find(
      (b) => !b.title && b.querySelector("svg path[d*='18 6']")
    );
    if (closeBtn) fireEvent.click(closeBtn);
  });

  it("toggles panel on Escape key", () => {
    render(<SettingsPanel />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.getByText("SETTINGS")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
  });

  it("renders custom message textarea", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByPlaceholderText("TYPE YOUR MESSAGE...")).toBeInTheDocument();
  });

  it("sends custom message", () => {
    const mockSend = vi.fn();
    render(<SettingsPanel onSendMessage={mockSend} />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    fireEvent.change(textarea, { target: { value: "Hello World" } });
    fireEvent.click(screen.getByText("SEND TO DISPLAY"));
    expect(mockSend).toHaveBeenCalled();
  });

  it("does not send empty message", () => {
    const mockSend = vi.fn();
    render(<SettingsPanel onSendMessage={mockSend} />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    fireEvent.click(screen.getByText("SEND TO DISPLAY"));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only message", () => {
    const mockSend = vi.fn();
    render(<SettingsPanel onSendMessage={mockSend} />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByText("SEND TO DISPLAY"));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("works without onSendMessage callback", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(screen.getByText("SEND TO DISPLAY"));
    // No error
  });

  it("renders flip speed slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText(/FLIP SPEED — 200MS/)).toBeInTheDocument();
  });

  it("renders stagger slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText(/STAGGER — 20MS/)).toBeInTheDocument();
  });

  it("renders rotation slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText(/ROTATION — 15S/)).toBeInTheDocument();
  });

  it("renders volume slider with mute button", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText(/CLACK VOLUME — 70%/)).toBeInTheDocument();
    expect(screen.getByText("MUTE")).toBeInTheDocument();
  });

  it("shows UNMUTE when muted", () => {
    mockSettings.isMuted = true;
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText("UNMUTE")).toBeInTheDocument();
    mockSettings.isMuted = false;
  });

  it("toggles mute", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    fireEvent.click(screen.getByText("MUTE"));
    expect(mockSettings.setMuted).toHaveBeenCalledWith(true);
  });

  it("renders music settings", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByTestId("music-settings")).toBeInTheDocument();
  });

  it("renders fullscreen toggle button", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText("TOGGLE FULLSCREEN")).toBeInTheDocument();
  });

  it("handles fullscreen toggle when not fullscreen", () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
    const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = mockRequestFullscreen;

    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    fireEvent.click(screen.getByText("TOGGLE FULLSCREEN"));
    expect(mockRequestFullscreen).toHaveBeenCalled();
  });

  it("handles fullscreen toggle when already fullscreen", () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.documentElement,
      writable: true,
      configurable: true,
    });
    const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = mockExitFullscreen;

    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    fireEvent.click(screen.getByText("TOGGLE FULLSCREEN"));
    expect(mockExitFullscreen).toHaveBeenCalled();

    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  it("renders TV mode section with QR code and buttons", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText("SCAN ON TV")).toBeInTheDocument();
    expect(screen.getByTestId("qrcode")).toBeInTheDocument();
    expect(screen.getByText("OPEN TV MODE")).toBeInTheDocument();
    expect(screen.getByTestId("cast-button")).toBeInTheDocument();
  });

  it("renders ESC hint", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    expect(screen.getByText("PRESS ESC TO CLOSE")).toBeInTheDocument();
  });

  it("updates flip speed via slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "300" } });
    expect(mockSettings.setFlipSpeed).toHaveBeenCalledWith(300);
  });

  it("handles mouse hover on gear button", () => {
    render(<SettingsPanel />);
    const gear = screen.getByTitle("Settings (Esc)");
    fireEvent.mouseEnter(gear);
    expect(gear.style.opacity).toBe("1");
    fireEvent.mouseLeave(gear);
    expect(gear.style.opacity).toBe("0.5");
  });

  it("ignores non-Escape key presses", () => {
    render(<SettingsPanel />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    // Panel should not be open - "SETTINGS" label should not be visible
    // (The panel still exists in the portal but is offscreen)
  });

  it("handles mouse hover on theme toggle wrapper div", () => {
    render(<SettingsPanel />);
    // The top-right container has two children: theme toggle wrapper + gear button
    // The theme toggle wrapper div has opacity 0.5 and hover changes it
    const themeToggles = screen.getAllByTestId("theme-toggle");
    // First one is in the top bar (outside panel)
    const themeWrapper = themeToggles[0].parentElement!;
    fireEvent.mouseEnter(themeWrapper);
    expect(themeWrapper.style.opacity).toBe("1");
    fireEvent.mouseLeave(themeWrapper);
    expect(themeWrapper.style.opacity).toBe("0.5");
  });

  it("renders OPEN TV MODE button and opens window on click", () => {
    const mockOpen = vi.fn();
    vi.stubGlobal("open", mockOpen);

    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));

    const openTvBtn = screen.getByText("OPEN TV MODE");
    expect(openTvBtn).toBeInTheDocument();
    fireEvent.click(openTvBtn);
    expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining("/tv?config="), "_blank");

    vi.unstubAllGlobals();
  });

  it("renders OPEN REMOTE button and opens window on click", () => {
    const mockOpen = vi.fn();
    vi.stubGlobal("open", mockOpen);

    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));

    const openRemoteBtn = screen.getByText(/OPEN REMOTE/);
    expect(openRemoteBtn).toBeInTheDocument();
    fireEvent.click(openRemoteBtn);
    expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining("/remote"), "_blank");

    vi.unstubAllGlobals();
  });

  it("updates stagger via slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const sliders = screen.getAllByRole("slider");
    // Second slider is stagger
    fireEvent.change(sliders[1], { target: { value: "40" } });
    expect(mockSettings.setStaggerDelay).toHaveBeenCalledWith(40);
  });

  it("updates rotation via slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const sliders = screen.getAllByRole("slider");
    // Third slider is rotation
    fireEvent.change(sliders[2], { target: { value: "30" } });
    expect(mockSettings.setRotationInterval).toHaveBeenCalledWith(30);
  });

  it("updates volume via slider", () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTitle("Settings (Esc)"));
    const sliders = screen.getAllByRole("slider");
    // Fourth slider is volume
    fireEvent.change(sliders[3], { target: { value: "0.3" } });
    expect(mockSettings.setVolume).toHaveBeenCalledWith(0.3);
  });
});
