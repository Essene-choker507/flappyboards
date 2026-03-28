import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSendMessage = vi.fn();
let mockIsConnected = false;
let mockConnectedDevices = 0;
let mockSocket: {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
} | null = null;

vi.mock("@/stores/room-store", () => ({
  useRoomStore: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    sendMessage: mockSendMessage,
    isConnected: mockIsConnected,
    connectedDevices: mockConnectedDevices,
    socket: mockSocket,
  }),
}));

import { usePartyConnection } from "@/hooks/usePartyConnection";

describe("usePartyConnection", () => {
  beforeEach(() => {
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    mockSendMessage.mockClear();
    mockIsConnected = false;
    mockConnectedDevices = 0;
    mockSocket = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connects on mount when roomCode is provided", () => {
    renderHook(() => usePartyConnection("1234", true, {}));

    expect(mockConnect).toHaveBeenCalledWith("1234", true);
  });

  it("does not connect when roomCode is null", () => {
    renderHook(() => usePartyConnection(null, false, {}));

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() =>
      usePartyConnection("1234", true, {})
    );

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("does not disconnect on unmount when roomCode is null", () => {
    const { unmount } = renderHook(() =>
      usePartyConnection(null, false, {})
    );

    unmount();

    // disconnect is not called because the effect didn't run the cleanup
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("returns isConnected, connectedDevices, send, and disconnect", () => {
    mockIsConnected = true;
    mockConnectedDevices = 3;

    const { result } = renderHook(() =>
      usePartyConnection("1234", false, {})
    );

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectedDevices).toBe(3);
    expect(typeof result.current.send).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
  });

  it("send calls sendMessage", () => {
    const { result } = renderHook(() =>
      usePartyConnection("1234", false, {})
    );

    act(() => {
      result.current.send({ type: "test" });
    });

    expect(mockSendMessage).toHaveBeenCalledWith({ type: "test" });
  });

  it("handles settings-changed message", () => {
    const onSettingsChange = vi.fn();
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() =>
      usePartyConnection("1234", false, { onSettingsChange })
    );

    // Get the message handler registered on the socket
    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    expect(addListenerCall).toBeTruthy();
    const handler = addListenerCall![1];

    act(() => {
      handler({
        data: JSON.stringify({
          type: "settings-changed",
          payload: { volume: 0.5 },
        }),
      });
    });

    expect(onSettingsChange).toHaveBeenCalledWith({ volume: 0.5 });
  });

  it("handles content-changed message", () => {
    const onContentChange = vi.fn();
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() =>
      usePartyConnection("1234", false, { onContentChange })
    );

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    act(() => {
      handler({
        data: JSON.stringify({
          type: "content-changed",
          payload: { lines: ["Hello", "World"] },
        }),
      });
    });

    expect(onContentChange).toHaveBeenCalledWith(["Hello", "World"]);
  });

  it("handles skip message", () => {
    const onSkip = vi.fn();
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() => usePartyConnection("1234", false, { onSkip }));

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    act(() => {
      handler({ data: JSON.stringify({ type: "skip" }) });
    });

    expect(onSkip).toHaveBeenCalled();
  });

  it("handles state-sync message", () => {
    const onStateSync = vi.fn();
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() =>
      usePartyConnection("1234", false, { onStateSync })
    );

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    const payload = {
      settings: {},
      currentContent: null,
      musicState: null,
      connectedClients: 2,
    };

    act(() => {
      handler({
        data: JSON.stringify({ type: "state-sync", payload }),
      });
    });

    expect(onStateSync).toHaveBeenCalledWith(payload);
  });

  it("handles music-update message", () => {
    const onMusicUpdate = vi.fn();
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() =>
      usePartyConnection("1234", false, { onMusicUpdate })
    );

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    act(() => {
      handler({
        data: JSON.stringify({
          type: "music-update",
          payload: { playing: true },
        }),
      });
    });

    expect(onMusicUpdate).toHaveBeenCalledWith({ playing: true });
  });

  it("ignores unknown message types without error", () => {
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() => usePartyConnection("1234", false, {}));

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    // Should not throw
    act(() => {
      handler({ data: JSON.stringify({ type: "unknown-type" }) });
    });
  });

  it("ignores malformed JSON messages", () => {
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() => usePartyConnection("1234", false, {}));

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    // Should not throw
    act(() => {
      handler({ data: "not json" });
    });
  });

  it("removes socket message listener on cleanup", () => {
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const { unmount } = renderHook(() =>
      usePartyConnection("1234", false, {})
    );

    unmount();

    expect(mockSocket.removeEventListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("does not add listener when socket is null", () => {
    mockSocket = null;

    renderHook(() => usePartyConnection("1234", false, {}));

    // No error, and no listener added (nothing to assert on since socket is null)
  });

  it("handles messages when optional handlers are not provided", () => {
    mockSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    renderHook(() => usePartyConnection("1234", false, {}));

    const addListenerCall = mockSocket.addEventListener.mock.calls.find(
      (c) => c[0] === "message"
    );
    const handler = addListenerCall![1];

    // Should not throw even without handlers
    act(() => {
      handler({
        data: JSON.stringify({
          type: "settings-changed",
          payload: {},
        }),
      });
    });

    act(() => {
      handler({
        data: JSON.stringify({
          type: "content-changed",
          payload: { lines: [] },
        }),
      });
    });

    act(() => {
      handler({ data: JSON.stringify({ type: "skip" }) });
    });

    act(() => {
      handler({
        data: JSON.stringify({ type: "state-sync", payload: {} }),
      });
    });

    act(() => {
      handler({
        data: JSON.stringify({ type: "music-update", payload: {} }),
      });
    });
  });
});
