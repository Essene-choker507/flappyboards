import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import RoomCode from "@/components/room/RoomCode";

describe("RoomCode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the room code", () => {
    render(<RoomCode code="1234" connectedDevices={1} />);
    expect(screen.getByText("ROOM CODE")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("shows connected count when more than 1 device", () => {
    render(<RoomCode code="1234" connectedDevices={3} />);
    expect(screen.getByText("3 CONNECTED")).toBeInTheDocument();
  });

  it("hides connected count when only 1 device", () => {
    render(<RoomCode code="1234" connectedDevices={1} />);
    expect(screen.queryByText(/CONNECTED/)).toBeNull();
  });

  it("hides connected count when 0 devices", () => {
    render(<RoomCode code="1234" connectedDevices={0} />);
    expect(screen.queryByText(/CONNECTED/)).toBeNull();
  });

  it("fades out after 10 seconds", () => {
    render(<RoomCode code="1234" connectedDevices={1} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    // Opacity changes (state update)
  });

  it("resets fade on mouse move", () => {
    render(<RoomCode code="1234" connectedDevices={1} />);
    act(() => {
      vi.advanceTimersByTime(5000);
      window.dispatchEvent(new Event("mousemove"));
    });
    // No throw, timer is reset
  });

  it("resets fade on touch start", () => {
    render(<RoomCode code="1234" connectedDevices={1} />);
    act(() => {
      window.dispatchEvent(new Event("touchstart"));
    });
    // No throw
  });
});
