import { describe, it, expect } from "vitest";
import {
  BLANK,
  FLIP_SEQUENCE,
  charToCode,
  codeToChar,
  calculateFlipPath,
  getSupportedChars,
} from "@/lib/vestaboard/charset";

describe("charset", () => {
  describe("BLANK constant", () => {
    it("should equal 0", () => {
      expect(BLANK).toBe(0);
    });
  });

  describe("FLIP_SEQUENCE", () => {
    it("should be a non-empty array of numbers", () => {
      expect(FLIP_SEQUENCE.length).toBeGreaterThan(0);
      expect(FLIP_SEQUENCE.every((c) => typeof c === "number")).toBe(true);
    });

    it("should start with 0 (blank)", () => {
      expect(FLIP_SEQUENCE[0]).toBe(0);
    });

    it("should contain all letter codes 1-26", () => {
      for (let i = 1; i <= 26; i++) {
        expect(FLIP_SEQUENCE).toContain(i);
      }
    });

    it("should contain digit codes 27-36", () => {
      for (const code of [27, 28, 29, 30, 31, 32, 33, 34, 35, 36]) {
        expect(FLIP_SEQUENCE).toContain(code);
      }
    });

    it("should contain symbol codes", () => {
      // ! @ # $ ( ) - + & = ; : ' " % , . / ? degree
      for (const code of [37, 38, 39, 40, 41, 42, 44, 46, 47, 48, 49, 50, 52, 53, 54, 55, 56, 59, 60, 62]) {
        expect(FLIP_SEQUENCE).toContain(code);
      }
    });

    it("should have no duplicate codes", () => {
      const unique = new Set(FLIP_SEQUENCE);
      expect(unique.size).toBe(FLIP_SEQUENCE.length);
    });
  });

  describe("charToCode", () => {
    it("should convert uppercase letters to their codes", () => {
      expect(charToCode("A")).toBe(1);
      expect(charToCode("Z")).toBe(26);
      expect(charToCode("M")).toBe(13);
    });

    it("should convert lowercase letters to their codes (case insensitive)", () => {
      expect(charToCode("a")).toBe(1);
      expect(charToCode("z")).toBe(26);
      expect(charToCode("m")).toBe(13);
    });

    it("should convert digits to their codes", () => {
      expect(charToCode("1")).toBe(27);
      expect(charToCode("9")).toBe(35);
      expect(charToCode("0")).toBe(36);
    });

    it("should convert space to BLANK", () => {
      expect(charToCode(" ")).toBe(BLANK);
    });

    it("should convert symbols to their codes", () => {
      expect(charToCode("!")).toBe(37);
      expect(charToCode("@")).toBe(38);
      expect(charToCode("#")).toBe(39);
      expect(charToCode("$")).toBe(40);
      expect(charToCode("(")).toBe(41);
      expect(charToCode(")")).toBe(42);
      expect(charToCode("-")).toBe(44);
      expect(charToCode("+")).toBe(46);
      expect(charToCode("&")).toBe(47);
      expect(charToCode("=")).toBe(48);
      expect(charToCode(";")).toBe(49);
      expect(charToCode(":")).toBe(50);
      expect(charToCode("'")).toBe(52);
      expect(charToCode('"')).toBe(53);
      expect(charToCode("%")).toBe(54);
      expect(charToCode(",")).toBe(55);
      expect(charToCode(".")).toBe(56);
      expect(charToCode("/")).toBe(59);
      expect(charToCode("?")).toBe(60);
      expect(charToCode("\u00B0")).toBe(62); // degree symbol
    });

    it("should return BLANK for empty string", () => {
      expect(charToCode("")).toBe(BLANK);
    });

    it("should return BLANK for unsupported characters", () => {
      expect(charToCode("~")).toBe(BLANK);
      expect(charToCode("^")).toBe(BLANK);
      expect(charToCode("{")).toBe(BLANK);
      expect(charToCode("\t")).toBe(BLANK);
    });
  });

  describe("codeToChar", () => {
    it("should convert code 0 to space", () => {
      expect(codeToChar(0)).toBe(" ");
    });

    it("should convert letter codes to uppercase letters", () => {
      expect(codeToChar(1)).toBe("A");
      expect(codeToChar(26)).toBe("Z");
      expect(codeToChar(13)).toBe("M");
    });

    it("should convert digit codes to digit characters", () => {
      expect(codeToChar(27)).toBe("1");
      expect(codeToChar(35)).toBe("9");
      expect(codeToChar(36)).toBe("0");
    });

    it("should convert symbol codes to symbols", () => {
      expect(codeToChar(37)).toBe("!");
      expect(codeToChar(56)).toBe(".");
      expect(codeToChar(60)).toBe("?");
    });

    it("should return space for unknown codes", () => {
      expect(codeToChar(999)).toBe(" ");
      expect(codeToChar(-1)).toBe(" ");
      expect(codeToChar(43)).toBe(" "); // gap in code table
    });
  });

  describe("calculateFlipPath", () => {
    it("should return empty array when from equals to", () => {
      expect(calculateFlipPath(0, 0)).toEqual([]);
      expect(calculateFlipPath(1, 1)).toEqual([]);
      expect(calculateFlipPath(26, 26)).toEqual([]);
    });

    it("should return direct forward path for sequential codes", () => {
      // A (1) to B (2) should step through just B
      const path = calculateFlipPath(1, 2);
      expect(path).toEqual([2]);
    });

    it("should return multi-step forward path", () => {
      // A (1) to C (3) should step through B, C
      const path = calculateFlipPath(1, 3);
      expect(path).toEqual([2, 3]);
    });

    it("should wrap around for reverse direction", () => {
      // B (2) to A (1) should wrap around the entire sequence
      const path = calculateFlipPath(2, 1);
      expect(path.length).toBeGreaterThan(1);
      expect(path[path.length - 1]).toBe(1);
      // Should not contain the starting code (2) at position 0
      expect(path[0]).not.toBe(2);
    });

    it("should handle blank (0) to letter transition", () => {
      const path = calculateFlipPath(0, 1); // blank to A
      expect(path).toEqual([1]);
    });

    it("should handle letter to blank (0) transition (wraps around)", () => {
      // From A (1) to blank (0) means cycling through the rest of the sequence
      const path = calculateFlipPath(1, 0);
      expect(path.length).toBe(FLIP_SEQUENCE.length - 1);
      expect(path[path.length - 1]).toBe(0);
    });

    it("should handle codes not in sequence by defaulting to index 0", () => {
      // Code 999 is not in the sequence, should default to index 0 (blank)
      const path = calculateFlipPath(999, 1);
      expect(path).toEqual([1]);
    });

    it("should handle both codes not in sequence", () => {
      // Both unknown codes default to index 0, so from=to effectively
      const path = calculateFlipPath(999, 998);
      // Both map to index 0, so from=0 to=0 index-wise, but codes differ
      // So the loop runs until it finds code 998 or exhausts the sequence
      expect(path.length).toBe(FLIP_SEQUENCE.length);
    });

    it("should include target code as last element", () => {
      const path = calculateFlipPath(1, 10); // A to J
      expect(path[path.length - 1]).toBe(10);
    });

    it("should not include starting code", () => {
      const path = calculateFlipPath(5, 10); // E to J
      expect(path[0]).toBe(6); // F, not E
    });
  });

  describe("getSupportedChars", () => {
    it("should return an array of strings", () => {
      const chars = getSupportedChars();
      expect(Array.isArray(chars)).toBe(true);
      expect(chars.every((c) => typeof c === "string")).toBe(true);
    });

    it("should include space", () => {
      expect(getSupportedChars()).toContain(" ");
    });

    it("should include all uppercase letters", () => {
      const chars = getSupportedChars();
      for (let i = 65; i <= 90; i++) {
        expect(chars).toContain(String.fromCharCode(i));
      }
    });

    it("should include all digits", () => {
      const chars = getSupportedChars();
      for (let i = 0; i <= 9; i++) {
        expect(chars).toContain(String(i));
      }
    });

    it("should include common symbols", () => {
      const chars = getSupportedChars();
      for (const sym of ["!", "@", "#", "$", "-", "+", ".", ",", "?", "/"]) {
        expect(chars).toContain(sym);
      }
    });

    it("should not include lowercase letters", () => {
      const chars = getSupportedChars();
      for (let i = 97; i <= 122; i++) {
        expect(chars).not.toContain(String.fromCharCode(i));
      }
    });
  });
});
