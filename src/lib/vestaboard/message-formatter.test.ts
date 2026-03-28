import { describe, it, expect } from "vitest";
import {
  formatMessage,
  formatLines,
  createEmptyBoard,
} from "@/lib/vestaboard/message-formatter";
import { BOARD_ROWS, BOARD_COLS } from "@/lib/vestaboard/layout";
import { BLANK, charToCode } from "@/lib/vestaboard/charset";

describe("message-formatter", () => {
  describe("formatMessage", () => {
    it("should return a 6x22 board", () => {
      const board = formatMessage("HELLO");
      expect(board.length).toBe(BOARD_ROWS);
      board.forEach((row) => {
        expect(row.length).toBe(BOARD_COLS);
      });
    });

    it("should center a short text on the first row", () => {
      const board = formatMessage("HI");
      // "HI" is 2 chars, padding = floor((22 - 2) / 2) = 10
      const row = board[0];
      expect(row[10]).toBe(charToCode("H"));
      expect(row[11]).toBe(charToCode("I"));
      // Before and after should be blank
      expect(row[9]).toBe(BLANK);
      expect(row[12]).toBe(BLANK);
    });

    it("should convert text to uppercase", () => {
      const board = formatMessage("hello");
      // "hello" -> "HELLO" centered: padding = floor((22-5)/2) = 8
      const row = board[0];
      expect(row[8]).toBe(charToCode("H"));
      expect(row[9]).toBe(charToCode("E"));
      expect(row[10]).toBe(charToCode("L"));
      expect(row[11]).toBe(charToCode("L"));
      expect(row[12]).toBe(charToCode("O"));
    });

    it("should handle multi-line text across rows", () => {
      const board = formatMessage("LINE1\nLINE2\nLINE3");
      // Each line should be on its own row
      // "LINE1" -> padding = floor((22-5)/2) = 8
      expect(board[0][8]).toBe(charToCode("L"));
      expect(board[1][8]).toBe(charToCode("L"));
      expect(board[2][8]).toBe(charToCode("L"));
      // Rows 3-5 should be all blank
      expect(board[3].every((c) => c === BLANK)).toBe(true);
      expect(board[4].every((c) => c === BLANK)).toBe(true);
      expect(board[5].every((c) => c === BLANK)).toBe(true);
    });

    it("should pad unused rows with blanks", () => {
      const board = formatMessage("ONLY ONE LINE");
      for (let r = 1; r < BOARD_ROWS; r++) {
        expect(board[r].every((c) => c === BLANK)).toBe(true);
      }
    });

    it("should truncate lines longer than 22 characters", () => {
      const longLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 26 chars
      const board = formatMessage(longLine);
      const row = board[0];
      // Truncated to 22 chars, so "ABCDEFGHIJKLMNOPQRSTUV"
      // Centered: padding = floor((22-22)/2) = 0
      expect(row[0]).toBe(charToCode("A"));
      expect(row[21]).toBe(charToCode("V"));
    });

    it("should truncate messages with more than 6 lines", () => {
      const text = "L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8";
      const board = formatMessage(text);
      expect(board.length).toBe(BOARD_ROWS);
      // Row 5 (index 5) should have L6, not L7
      // "L6" -> padding = floor((22-2)/2) = 10
      expect(board[5][10]).toBe(charToCode("L"));
      expect(board[5][11]).toBe(charToCode("6"));
    });

    it("should handle empty string", () => {
      const board = formatMessage("");
      expect(board.length).toBe(BOARD_ROWS);
      board.forEach((row) => {
        expect(row.every((c) => c === BLANK)).toBe(true);
      });
    });

    it("should handle empty lines in multi-line text", () => {
      const board = formatMessage("\n\nHI");
      // Row 0 and 1 should be blank, row 2 should have "HI"
      expect(board[0].every((c) => c === BLANK)).toBe(true);
      expect(board[1].every((c) => c === BLANK)).toBe(true);
      // "HI" on row 2 at padding=10
      expect(board[2][10]).toBe(charToCode("H"));
      expect(board[2][11]).toBe(charToCode("I"));
    });

    it("should handle a line that fills exactly 22 characters", () => {
      const exact = "ABCDEFGHIJKLMNOPQRSTUV"; // exactly 22 chars
      const board = formatMessage(exact);
      const row = board[0];
      // padding = 0, should be exactly the chars
      expect(row[0]).toBe(charToCode("A"));
      expect(row[21]).toBe(charToCode("V"));
    });

    it("should handle odd-length centering (left-biased padding)", () => {
      // "ABC" is 3 chars, padding = floor((22-3)/2) = 9
      const board = formatMessage("ABC");
      const row = board[0];
      expect(row[8]).toBe(BLANK);
      expect(row[9]).toBe(charToCode("A"));
      expect(row[10]).toBe(charToCode("B"));
      expect(row[11]).toBe(charToCode("C"));
      expect(row[12]).toBe(BLANK);
    });

    it("should convert unsupported characters to BLANK", () => {
      const board = formatMessage("A~B");
      // "A~B" -> "A~B" uppercase, ~ is unsupported -> BLANK
      // padding = floor((22-3)/2) = 9
      const row = board[0];
      expect(row[9]).toBe(charToCode("A"));
      expect(row[10]).toBe(BLANK); // ~ -> BLANK
      expect(row[11]).toBe(charToCode("B"));
    });
  });

  describe("formatLines", () => {
    it("should join lines and format like formatMessage", () => {
      const lines = ["HELLO", "WORLD"];
      const fromLines = formatLines(lines);
      const fromMessage = formatMessage("HELLO\nWORLD");
      expect(fromLines).toEqual(fromMessage);
    });

    it("should handle empty array", () => {
      const board = formatLines([]);
      expect(board.length).toBe(BOARD_ROWS);
      board.forEach((row) => {
        expect(row.every((c) => c === BLANK)).toBe(true);
      });
    });

    it("should handle single line", () => {
      const board = formatLines(["TEST"]);
      const expected = formatMessage("TEST");
      expect(board).toEqual(expected);
    });

    it("should handle 6 lines", () => {
      const lines = ["A", "B", "C", "D", "E", "F"];
      const board = formatLines(lines);
      expect(board.length).toBe(BOARD_ROWS);
      // Each row should have the corresponding letter centered
      lines.forEach((letter, idx) => {
        // padding = floor((22-1)/2) = 10
        expect(board[idx][10]).toBe(charToCode(letter));
      });
    });
  });

  describe("createEmptyBoard", () => {
    it("should return a 6x22 board of all blanks", () => {
      const board = createEmptyBoard();
      expect(board.length).toBe(BOARD_ROWS);
      board.forEach((row) => {
        expect(row.length).toBe(BOARD_COLS);
        expect(row.every((c) => c === BLANK)).toBe(true);
      });
    });

    it("should return a new array each time (no shared references)", () => {
      const board1 = createEmptyBoard();
      const board2 = createEmptyBoard();
      expect(board1).not.toBe(board2);
      expect(board1[0]).not.toBe(board2[0]);
    });

    it("should have independent rows (mutating one does not affect others)", () => {
      const board = createEmptyBoard();
      board[0][0] = 99;
      expect(board[1][0]).toBe(BLANK);
    });
  });
});
