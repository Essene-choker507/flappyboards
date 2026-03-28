import { describe, it, expect, beforeEach } from "vitest";
import { useDisplayStore } from "@/stores/display-store";
import { createEmptyBoard } from "@/lib/vestaboard/message-formatter";
import type { BoardState } from "@/types";

describe("useDisplayStore", () => {
  beforeEach(() => {
    useDisplayStore.setState({
      currentBoard: createEmptyBoard(),
      targetBoard: createEmptyBoard(),
      isTransitioning: false,
    });
  });

  it("has correct initial state", () => {
    const state = useDisplayStore.getState();
    expect(state.currentBoard).toEqual(createEmptyBoard());
    expect(state.targetBoard).toEqual(createEmptyBoard());
    expect(state.isTransitioning).toBe(false);
  });

  it("initial board has correct dimensions (6 rows x 22 cols)", () => {
    const state = useDisplayStore.getState();
    expect(state.currentBoard).toHaveLength(6);
    state.currentBoard.forEach((row) => {
      expect(row).toHaveLength(22);
    });
  });

  describe("setCurrentBoard", () => {
    it("updates the current board", () => {
      const board: BoardState = Array.from({ length: 6 }, () =>
        Array.from({ length: 22 }, () => 1)
      );
      useDisplayStore.getState().setCurrentBoard(board);
      expect(useDisplayStore.getState().currentBoard).toEqual(board);
    });
  });

  describe("setTargetBoard", () => {
    it("updates the target board", () => {
      const board: BoardState = Array.from({ length: 6 }, () =>
        Array.from({ length: 22 }, () => 2)
      );
      useDisplayStore.getState().setTargetBoard(board);
      expect(useDisplayStore.getState().targetBoard).toEqual(board);
    });
  });

  describe("setTransitioning", () => {
    it("sets isTransitioning to true", () => {
      useDisplayStore.getState().setTransitioning(true);
      expect(useDisplayStore.getState().isTransitioning).toBe(true);
    });

    it("sets isTransitioning to false", () => {
      useDisplayStore.getState().setTransitioning(true);
      useDisplayStore.getState().setTransitioning(false);
      expect(useDisplayStore.getState().isTransitioning).toBe(false);
    });
  });
});
