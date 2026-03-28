import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RemoteControl from "@/components/remote/RemoteControl";

const defaultSettings = {
  flipSpeed: 160,
  staggerDelay: 20,
  rotationInterval: 15,
  volume: 0.7,
  isMuted: false,
  theme: "dark" as const,
};

describe("RemoteControl", () => {
  const mockSendMessage = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (overrides = {}) =>
    render(
      <RemoteControl
        settings={{ ...defaultSettings, ...overrides }}
        roomCode="1234"
        connectedDevices={2}
        onSendMessage={mockSendMessage}
        onDisconnect={mockDisconnect}
      />
    );

  it("renders header", () => {
    renderComponent();
    expect(screen.getByText("FLAPPYBOARDS")).toBeInTheDocument();
    expect(screen.getByText("REMOTE")).toBeInTheDocument();
  });

  it("renders message textarea", () => {
    renderComponent();
    expect(screen.getByPlaceholderText("TYPE YOUR MESSAGE...")).toBeInTheDocument();
  });

  it("sends custom message", () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(screen.getByText("SEND"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "content-change",
        payload: expect.objectContaining({ lines: expect.any(Array) }),
      })
    );
  });

  it("does not send empty message", () => {
    renderComponent();
    fireEvent.click(screen.getByText("SEND"));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("clears textarea after sending", () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.click(screen.getByText("SEND"));
    expect(textarea).toHaveValue("");
  });

  it("sends skip-next message", () => {
    renderComponent();
    fireEvent.click(screen.getByText("SKIP TO NEXT"));
    expect(mockSendMessage).toHaveBeenCalledWith({ type: "skip-next" });
  });

  it("renders theme toggle buttons", () => {
    renderComponent();
    expect(screen.getByText("DARK")).toBeInTheDocument();
    expect(screen.getByText("LIGHT")).toBeInTheDocument();
  });

  it("sends theme change", () => {
    renderComponent();
    fireEvent.click(screen.getByText("LIGHT"));
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "settings-update",
      payload: { theme: "light" },
    });
  });

  it("renders flip speed slider", () => {
    renderComponent();
    expect(screen.getByText(/FLIP SPEED — 160MS/)).toBeInTheDocument();
  });

  it("updates flip speed", () => {
    renderComponent();
    const sliders = screen.getAllByRole("slider");
    // First slider is flip speed
    fireEvent.change(sliders[0], { target: { value: "200" } });
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "settings-update",
      payload: { flipSpeed: 200 },
    });
  });

  it("renders stagger slider", () => {
    renderComponent();
    expect(screen.getByText(/STAGGER — 20MS/)).toBeInTheDocument();
  });

  it("renders rotation slider", () => {
    renderComponent();
    expect(screen.getByText(/ROTATION — 15S/)).toBeInTheDocument();
  });

  it("renders volume slider with percentage", () => {
    renderComponent();
    expect(screen.getByText(/VOLUME — 70%/)).toBeInTheDocument();
  });

  it("renders mute button", () => {
    renderComponent();
    expect(screen.getByText("MUTE")).toBeInTheDocument();
  });

  it("shows UNMUTE when muted", () => {
    renderComponent({ isMuted: true });
    expect(screen.getByText("UNMUTE")).toBeInTheDocument();
  });

  it("toggles mute", () => {
    renderComponent();
    fireEvent.click(screen.getByText("MUTE"));
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "settings-update",
      payload: { isMuted: true },
    });
  });

  it("shows room code and connected devices", () => {
    renderComponent();
    expect(screen.getByText("ROOM 1234")).toBeInTheDocument();
    expect(screen.getByText("2 DEVICES")).toBeInTheDocument();
  });

  it("shows singular DEVICE for 1 device", () => {
    render(
      <RemoteControl
        settings={defaultSettings}
        roomCode="1234"
        connectedDevices={1}
        onSendMessage={mockSendMessage}
        onDisconnect={mockDisconnect}
      />
    );
    expect(screen.getByText("1 DEVICE")).toBeInTheDocument();
  });

  it("calls onDisconnect", () => {
    renderComponent();
    fireEvent.click(screen.getByText("DISCONNECT"));
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("sends lastfm connect on button click", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "myuser" } });
    // The button text is CONNECT initially
    fireEvent.click(screen.getAllByText("CONNECT")[0]);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "music-control",
        payload: expect.objectContaining({
          source: "lastfm",
          lastfmUsername: "myuser",
        }),
      })
    );
  });

  it("does not send lastfm connect with empty username", () => {
    renderComponent();
    fireEvent.click(screen.getAllByText("CONNECT")[0]);
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "music-control" })
    );
  });

  it("sends lastfm connect on Enter key", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "testfm" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "music-control",
        payload: expect.objectContaining({ lastfmUsername: "testfm" }),
      })
    );
  });

  it("does not send lastfm connect on Enter with empty input", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.keyDown(input, { key: "Enter" });
    // Should not have been called with music-control
    const musicControlCalls = mockSendMessage.mock.calls.filter(
      (call) => call[0]?.type === "music-control"
    );
    expect(musicControlCalls.length).toBe(0);
  });

  it("shows disconnect lastfm button after connecting", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "myuser" } });
    fireEvent.click(screen.getAllByText("CONNECT")[0]);
    expect(screen.getByText("DISCONNECT LAST.FM")).toBeInTheDocument();
  });

  it("disconnects lastfm and clears input", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "myuser" } });
    fireEvent.click(screen.getAllByText("CONNECT")[0]);
    mockSendMessage.mockClear();

    fireEvent.click(screen.getByText("DISCONNECT LAST.FM"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "music-control",
        payload: expect.objectContaining({ source: "off", lastfmUsername: null }),
      })
    );
    expect(input).toHaveValue("");
  });

  it("shows UPDATE button after lastfm is connected", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("LAST.FM USERNAME");
    fireEvent.change(input, { target: { value: "myuser" } });
    fireEvent.click(screen.getAllByText("CONNECT")[0]);
    expect(screen.getByText("UPDATE")).toBeInTheDocument();
  });

  it("updates stagger delay via slider", () => {
    renderComponent();
    const sliders = screen.getAllByRole("slider");
    // Second slider is stagger
    fireEvent.change(sliders[1], { target: { value: "40" } });
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "settings-update",
      payload: { staggerDelay: 40 },
    });
  });

  it("updates rotation interval via slider", () => {
    renderComponent();
    const sliders = screen.getAllByRole("slider");
    // Third slider is rotation
    fireEvent.change(sliders[2], { target: { value: "30" } });
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "settings-update",
      payload: { rotationInterval: 30 },
    });
  });

  it("updates volume via slider", () => {
    renderComponent();
    const sliders = screen.getAllByRole("slider");
    // Fourth slider is volume
    fireEvent.change(sliders[3], { target: { value: "0.5" } });
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "settings-update",
      payload: { volume: 0.5 },
    });
  });

  it("renders Section labels for all sections", () => {
    renderComponent();
    expect(screen.getByText("MESSAGE")).toBeInTheDocument();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
    expect(screen.getByText(/FLIP SPEED/)).toBeInTheDocument();
    expect(screen.getByText(/STAGGER/)).toBeInTheDocument();
    expect(screen.getByText(/ROTATION/)).toBeInTheDocument();
    expect(screen.getByText(/VOLUME/)).toBeInTheDocument();
    expect(screen.getByText("CONNECTION")).toBeInTheDocument();
    expect(screen.getByText("THEME")).toBeInTheDocument();
  });

  it("SEND button uses inactive style when text is empty", () => {
    renderComponent();
    const sendBtn = screen.getByText("SEND");
    // When disabled (empty text), the button should be disabled
    expect(sendBtn).toBeDisabled();
  });

  it("SEND button uses active style when text is present", () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    fireEvent.change(textarea, { target: { value: "Hi" } });
    const sendBtn = screen.getByText("SEND");
    expect(sendBtn).not.toBeDisabled();
  });

  it("handleSendCustom returns early when text is whitespace-only", () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText("TYPE YOUR MESSAGE...");
    // Set text to whitespace only
    fireEvent.change(textarea, { target: { value: "   " } });
    // Button should be disabled, but let's also verify handler
    const sendBtn = screen.getByText("SEND");
    fireEvent.click(sendBtn);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("lastfm connect button with empty input does not send", () => {
    renderComponent();
    // Find the connect button in the lastfm section by getting all buttons
    const buttons = screen.getAllByRole("button");
    // The CONNECT button for lastfm
    const connectBtn = buttons.find((b) => b.textContent === "CONNECT");
    if (connectBtn) {
      fireEvent.click(connectBtn);
    }
    // Should not have been called with music-control
    const musicCalls = mockSendMessage.mock.calls.filter(
      (call) => call[0]?.type === "music-control"
    );
    expect(musicCalls.length).toBe(0);
  });
});
