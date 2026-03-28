import { describe, it, expect } from "vitest";
import { QUOTES } from "@/lib/content/quotes";

describe("quotes", () => {
  describe("QUOTES array", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(QUOTES)).toBe(true);
      expect(QUOTES.length).toBeGreaterThan(0);
    });

    it("should have 30 quotes", () => {
      expect(QUOTES.length).toBe(30);
    });

    it("every quote should have a unique id", () => {
      const ids = QUOTES.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(QUOTES.length);
    });

    it('every quote should have type "quote"', () => {
      QUOTES.forEach((q) => {
        expect(q.type).toBe("quote");
      });
    });

    it("every quote should have exactly 6 lines", () => {
      QUOTES.forEach((q) => {
        expect(q.lines.length).toBe(6);
      });
    });

    it("every line should be at most 22 characters", () => {
      QUOTES.forEach((q) => {
        q.lines.forEach((line) => {
          expect(line.length).toBeLessThanOrEqual(22);
        });
      });
    });

    it("every non-empty line should be uppercase", () => {
      QUOTES.forEach((q) => {
        q.lines.forEach((line) => {
          if (line.trim().length > 0) {
            expect(line).toBe(line.toUpperCase());
          }
        });
      });
    });

    it("should contain specific known quotes", () => {
      const ids = QUOTES.map((q) => q.id);
      expect(ids).toContain("jobs-hungry");
      expect(ids).toContain("einstein-imagination");
      expect(ids).toContain("gandhi-change");
      expect(ids).toContain("curie-curious");
    });

    it("every quote should have an id that is a non-empty string", () => {
      QUOTES.forEach((q) => {
        expect(typeof q.id).toBe("string");
        expect(q.id.length).toBeGreaterThan(0);
      });
    });

    it("every quote lines should be an array of strings", () => {
      QUOTES.forEach((q) => {
        expect(Array.isArray(q.lines)).toBe(true);
        q.lines.forEach((line) => {
          expect(typeof line).toBe("string");
        });
      });
    });
  });
});
