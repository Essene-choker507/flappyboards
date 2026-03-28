import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock PartySocket before importing the store
const mockSend = vi.fn();
const mockClose = vi.fn();
const mockAddEventListener = vi.fn();

vi.mock("partysocket", () => {
  const MockPartySocket = vi.fn(function (this: Record<string, unknown>) {
    this.send = mockSend;
    this.close = mockClose;
    this.addEventListener = mockAddEventListener;
    this.readyState = 1; // WebSocket.OPEN
  });
  return { default: MockPartySocket };
});

import { useRoomStore } from "@/stores/room-store";

describe("useRoomStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoomStore.setState({
      roomCode: null,
      isHost: false,
      isConnected: false,
      connectedDevices: 0,
      socket: null,
    });
  });

  it("has correct initial state", () => {
    const state = useRoomStore.getState();
    expect(state.roomCode).toBeNull();
    expect(state.isHost).toBe(false);
    expect(state.isConnected).toBe(false);
    expect(state.connectedDevices).toBe(0);
    expect(state.socket).toBeNull();
  });

  describe("generateRoomCode", () => {
    it("returns a 4-digit string code", () => {
      const code = useRoomStore.getState().generateRoomCode();
      expect(code).toMatch(/^\d{4}$/);
    });

    it("stores the generated code in state", () => {
      const code = useRoomStore.getState().generateRoomCode();
      expect(useRoomStore.getState().roomCode).toBe(code);
    });

    it("generates a code between 1000 and 9999", () => {
      const code = useRoomStore.getState().generateRoomCode();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThan(10000);
    });
  });

  describe("connect", () => {
    it("creates a new PartySocket and sets state", async () => {
      const { default: PartySocket } = await import("partysocket");
      useRoomStore.getState().connect("1234", true);

      expect(PartySocket).toHaveBeenCalledWith({
        host: "localhost:1999",
        room: "1234",
      });

      const state = useRoomStore.getState();
      expect(state.roomCode).toBe("1234");
      expect(state.isHost).toBe(true);
      expect(state.socket).not.toBeNull();
    });

    it("closes existing socket before creating a new one", () => {
      // First connection
      useRoomStore.getState().connect("1111", true);

      // Second connection should close first
      useRoomStore.getState().connect("2222", false);
      expect(mockClose).toHaveBeenCalled();
    });

    it("registers event listeners for open, close, and message", () => {
      useRoomStore.getState().connect("1234", false);
      const eventNames = mockAddEventListener.mock.calls.map(
        (call: unknown[]) => call[0]
      );
      expect(eventNames).toContain("open");
      expect(eventNames).toContain("close");
      expect(eventNames).toContain("message");
    });

    it("sets isConnected true and sends register-host on open when isHost", () => {
      useRoomStore.getState().connect("1234", true);

      // Find the 'open' event handler and call it
      const openCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "open"
      );
      expect(openCall).toBeDefined();
      (openCall![1] as () => void)();

      const state = useRoomStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.roomCode).toBe("1234");
      expect(state.isHost).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ type: "register-host" })
      );
    });

    it("sets isConnected true but does not send register-host when not isHost", () => {
      useRoomStore.getState().connect("1234", false);

      const openCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "open"
      );
      (openCall![1] as () => void)();

      expect(useRoomStore.getState().isConnected).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("sets isConnected false on close", () => {
      useRoomStore.getState().connect("1234", true);

      // Trigger open first
      const openCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "open"
      );
      (openCall![1] as () => void)();
      expect(useRoomStore.getState().isConnected).toBe(true);

      // Now trigger close
      const closeCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "close"
      );
      (closeCall![1] as () => void)();
      expect(useRoomStore.getState().isConnected).toBe(false);
    });

    it("updates connectedDevices on client-count message", () => {
      useRoomStore.getState().connect("1234", true);

      const messageCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "message"
      );
      (messageCall![1] as (event: { data: string }) => void)({
        data: JSON.stringify({ type: "client-count", payload: 5 }),
      });

      expect(useRoomStore.getState().connectedDevices).toBe(5);
    });

    it("ignores non-client-count messages", () => {
      useRoomStore.getState().connect("1234", true);

      const messageCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "message"
      );
      (messageCall![1] as (event: { data: string }) => void)({
        data: JSON.stringify({ type: "other-message", payload: "test" }),
      });

      expect(useRoomStore.getState().connectedDevices).toBe(0);
    });

    it("ignores invalid JSON messages", () => {
      useRoomStore.getState().connect("1234", true);

      const messageCall = mockAddEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "message"
      );
      // Should not throw
      (messageCall![1] as (event: { data: string }) => void)({
        data: "not valid json{{{",
      });

      expect(useRoomStore.getState().connectedDevices).toBe(0);
    });
  });

  describe("disconnect", () => {
    it("closes socket and resets state", () => {
      useRoomStore.getState().connect("1234", true);
      useRoomStore.getState().disconnect();

      const state = useRoomStore.getState();
      expect(mockClose).toHaveBeenCalled();
      expect(state.socket).toBeNull();
      expect(state.roomCode).toBeNull();
      expect(state.isHost).toBe(false);
      expect(state.isConnected).toBe(false);
      expect(state.connectedDevices).toBe(0);
    });

    it("handles disconnect when no socket exists", () => {
      // Should not throw
      useRoomStore.getState().disconnect();
      const state = useRoomStore.getState();
      expect(state.socket).toBeNull();
      expect(state.roomCode).toBeNull();
    });
  });

  describe("sendMessage", () => {
    it("sends JSON stringified message when socket is open", () => {
      useRoomStore.getState().connect("1234", true);

      // Mock readyState to be OPEN (1)
      const socket = useRoomStore.getState().socket!;
      Object.defineProperty(socket, "readyState", {
        value: WebSocket.OPEN,
        writable: true,
      });

      useRoomStore.getState().sendMessage({ type: "test", data: "hello" });
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ type: "test", data: "hello" })
      );
    });

    it("does not send when socket is null", () => {
      mockSend.mockClear();
      useRoomStore.getState().sendMessage({ type: "test" });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("does not send when socket is not in OPEN state", () => {
      useRoomStore.getState().connect("1234", true);
      mockSend.mockClear();

      const socket = useRoomStore.getState().socket!;
      Object.defineProperty(socket, "readyState", {
        value: WebSocket.CLOSED,
        writable: true,
      });

      useRoomStore.getState().sendMessage({ type: "test" });
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
