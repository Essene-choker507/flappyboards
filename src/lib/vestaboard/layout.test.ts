import { describe, it, expect } from "vitest";
import { BOARD_ROWS, BOARD_COLS, TOTAL_TILES } from "@/lib/vestaboard/layout";

describe("layout", () => {
  describe("BOARD_ROWS", () => {
    it("should be 6", () => {
      expect(BOARD_ROWS).toBe(6);
    });
  });

  describe("BOARD_COLS", () => {
    it("should be 22", () => {
      expect(BOARD_COLS).toBe(22);
    });
  });

  describe("TOTAL_TILES", () => {
    it("should be BOARD_ROWS * BOARD_COLS (132)", () => {
      expect(TOTAL_TILES).toBe(132);
      expect(TOTAL_TILES).toBe(BOARD_ROWS * BOARD_COLS);
    });
  });
});
