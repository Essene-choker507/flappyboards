import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RoomJoin from "@/components/room/RoomJoin";

describe("RoomJoin", () => {
  const mockConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header and input fields", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    expect(screen.getByText("FLAPPYBOARDS")).toBeInTheDocument();
    expect(screen.getByText("REMOTE")).toBeInTheDocument();
    expect(screen.getByText("ENTER ROOM CODE")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("renders CONNECT button", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    expect(screen.getByText("CONNECT")).toBeInTheDocument();
  });

  it("shows CONNECTING... when isConnecting", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={true} error={null} />
    );
    expect(screen.getByText("CONNECTING...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(
      <RoomJoin
        onConnect={mockConnect}
        isConnecting={false}
        error="INVALID CODE"
      />
    );
    expect(screen.getByText("INVALID CODE")).toBeInTheDocument();
  });

  it("does not show error when null", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    expect(screen.queryByText("INVALID CODE")).toBeNull();
  });

  it("accepts digit input and auto-advances", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "1" } });
    expect(inputs[0]).toHaveValue("1");
  });

  it("rejects non-digit input", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "a" } });
    expect(inputs[0]).toHaveValue("");
  });

  it("auto-connects when all 4 digits are filled", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "1" } });
    fireEvent.change(inputs[1], { target: { value: "2" } });
    fireEvent.change(inputs[2], { target: { value: "3" } });
    fireEvent.change(inputs[3], { target: { value: "4" } });
    expect(mockConnect).toHaveBeenCalledWith("1234");
  });

  it("handles backspace to go to previous input", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "1" } });
    fireEvent.change(inputs[1], { target: { value: "2" } });
    // Clear second input then press backspace
    fireEvent.change(inputs[1], { target: { value: "" } });
    fireEvent.keyDown(inputs[1], { key: "Backspace" });
    // Should focus previous input
  });

  it("does not go back on backspace at first input", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.keyDown(inputs[0], { key: "Backspace" });
    // No error
  });

  it("handles paste of 4-digit code", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const container = screen.getAllByRole("textbox")[0].parentElement!;
    fireEvent.paste(container, {
      clipboardData: { getData: () => "5678" },
    });
    expect(mockConnect).toHaveBeenCalledWith("5678");
  });

  it("ignores paste of non-4-digit code", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const container = screen.getAllByRole("textbox")[0].parentElement!;
    fireEvent.paste(container, {
      clipboardData: { getData: () => "12" },
    });
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("handles paste with non-digit characters", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const container = screen.getAllByRole("textbox")[0].parentElement!;
    fireEvent.paste(container, {
      clipboardData: { getData: () => "ab1234cd" },
    });
    expect(mockConnect).toHaveBeenCalledWith("1234");
  });

  it("connect button calls onConnect when code is complete", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "1" } });
    fireEvent.change(inputs[1], { target: { value: "2" } });
    fireEvent.change(inputs[2], { target: { value: "3" } });
    fireEvent.change(inputs[3], { target: { value: "4" } });
    mockConnect.mockClear();
    fireEvent.click(screen.getByText("CONNECT"));
    expect(mockConnect).toHaveBeenCalledWith("1234");
  });

  it("connect button is disabled when code is incomplete", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={false} error={null} />
    );
    const btn = screen.getByText("CONNECT");
    fireEvent.click(btn);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("connect button is disabled when connecting", () => {
    render(
      <RoomJoin onConnect={mockConnect} isConnecting={true} error={null} />
    );
    expect(screen.getByText("CONNECTING...")).toBeDisabled();
  });
});
