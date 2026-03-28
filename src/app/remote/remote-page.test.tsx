import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Capture the callbacks passed to usePartyConnection
let capturedCallbacks: {
  onStateSync?: (state: Record<string, unknown>) => void;
  onSettingsChange?: (incoming: Record<string, unknown>) => void;
} = {};

vi.mock("@/components/room/RoomJoin", () => ({
  default: ({
    onConnect,
    isConnecting,
    error,
  }: {
    onConnect: (code: string) => void;
    isConnecting: boolean;
    error: string | null;
  }) => (
    <div data-testid="room-join">
      <span>{isConnecting ? "connecting" : "idle"}</span>
      {error && <span>{error}</span>}
      <button onClick={() => onConnect("1234")}>join</button>
    </div>
  ),
}));

let capturedRemoteProps: Record<string, unknown> = {};

vi.mock("@/components/remote/RemoteControl", () => ({
  default: (props: {
    settings: Record<string, unknown>;
    roomCode: string;
    connectedDevices: number;
    onSendMessage: (msg: object) => void;
    onDisconnect: () => void;
  }) => {
    capturedRemoteProps = props;
    return (
      <div data-testid="remote-control">
        <span>Room: {props.roomCode}</span>
        <span>Devices: {props.connectedDevices}</span>
        <span data-testid="settings-json">{JSON.stringify(props.settings)}</span>
        <button onClick={props.onDisconnect}>disconnect</button>
      </div>
    );
  },
}));

const mockDisconnect = vi.fn();
const mockSend = vi.fn();
let mockIsConnected = false;
let mockConnectedDevices = 0;

vi.mock("@/hooks/usePartyConnection", () => ({
  usePartyConnection: (_roomCode: string | null, _isHost: boolean, callbacks: Record<string, unknown>) => {
    capturedCallbacks = callbacks as typeof capturedCallbacks;
    return {
      get isConnected() {
        return mockIsConnected;
      },
      get connectedDevices() {
        return mockConnectedDevices;
      },
      send: mockSend,
      disconnect: mockDisconnect,
    };
  },
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

const mockSetTheme = vi.fn();

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
    setTheme: mockSetTheme,
  }),
}));

import RemotePage from "@/app/remote/page";

describe("RemotePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConnected = false;
    mockConnectedDevices = 0;
    capturedCallbacks = {};
    capturedRemoteProps = {};
  });

  it("renders RoomJoin when not connected", () => {
    render(<RemotePage />);
    expect(screen.getByTestId("room-join")).toBeInTheDocument();
  });

  it("shows connecting state when join is clicked", () => {
    render(<RemotePage />);
    fireEvent.click(screen.getByText("join"));
    expect(screen.getByText("connecting")).toBeInTheDocument();
  });

  it("renders RemoteControl when connected", () => {
    mockIsConnected = true;
    mockConnectedDevices = 2;
    render(<RemotePage />);
    expect(screen.getByTestId("remote-control")).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(<RemotePage />);
    const backLink = screen.getByTitle("Back to home");
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("renders theme toggle", () => {
    render(<RemotePage />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("handles disconnect from remote control", () => {
    mockIsConnected = true;
    mockConnectedDevices = 1;
    render(<RemotePage />);
    fireEvent.click(screen.getByText("disconnect"));
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("hover effects on back button", () => {
    render(<RemotePage />);
    const back = screen.getByTitle("Back to home");
    fireEvent.mouseEnter(back);
    expect(back.style.opacity).toBe("1");
    fireEvent.mouseLeave(back);
    expect(back.style.opacity).toBe("0.5");
  });

  it("hover effects on theme toggle container", () => {
    const { container } = render(<RemotePage />);
    // The theme toggle wrapper div has opacity 0.6
    const themeWrapper = screen.getByTestId("theme-toggle").parentElement!;
    fireEvent.mouseEnter(themeWrapper);
    expect(themeWrapper.style.opacity).toBe("1");
    fireEvent.mouseLeave(themeWrapper);
    expect(themeWrapper.style.opacity).toBe("0.6");
  });

  it("onStateSync callback updates settings and applies theme", () => {
    mockIsConnected = true;
    mockConnectedDevices = 1;
    render(<RemotePage />);

    // Trigger onStateSync
    act(() => {
      capturedCallbacks.onStateSync?.({
        settings: {
          flipSpeed: 300,
          staggerDelay: 30,
          rotationInterval: 20,
          volume: 0.5,
          isMuted: true,
          theme: "light",
        },
      });
    });

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    // The settings should have been updated in the component state
    expect(screen.getByTestId("settings-json").textContent).toContain('"flipSpeed":300');
  });

  it("onStateSync callback without settings does not crash", () => {
    mockIsConnected = true;
    render(<RemotePage />);

    act(() => {
      capturedCallbacks.onStateSync?.({});
    });

    // No crash, isConnecting should be cleared
  });

  it("onStateSync callback without theme in settings does not call setTheme", () => {
    mockIsConnected = true;
    render(<RemotePage />);

    act(() => {
      capturedCallbacks.onStateSync?.({
        settings: {
          flipSpeed: 300,
          staggerDelay: 30,
          rotationInterval: 20,
          volume: 0.5,
          isMuted: true,
        },
      });
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("onSettingsChange callback merges settings and applies theme", () => {
    mockIsConnected = true;
    mockConnectedDevices = 1;
    render(<RemotePage />);

    act(() => {
      capturedCallbacks.onSettingsChange?.({ theme: "light" });
    });

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("onSettingsChange callback without theme does not call setTheme", () => {
    mockIsConnected = true;
    render(<RemotePage />);

    act(() => {
      capturedCallbacks.onSettingsChange?.({ flipSpeed: 250 });
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("passes all required props to RemoteControl when connected", () => {
    mockIsConnected = true;
    mockConnectedDevices = 3;
    render(<RemotePage />);

    // Need to join first for roomCode to be set - but since isConnected is true,
    // the RemoteControl renders. The roomCode might be null, so let's verify props exist.
    expect(capturedRemoteProps).toHaveProperty("settings");
    expect(capturedRemoteProps).toHaveProperty("onSendMessage");
    expect(capturedRemoteProps).toHaveProperty("onDisconnect");
    expect(capturedRemoteProps.connectedDevices).toBe(3);
  });
});
