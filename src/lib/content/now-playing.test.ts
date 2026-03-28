import { describe, it, expect } from "vitest";
import { formatNowPlaying } from "@/lib/content/now-playing";

describe("now-playing", () => {
  describe("formatNowPlaying", () => {
    it("should return exactly 6 lines", () => {
      const result = formatNowPlaying("Song", "Artist");
      expect(result.length).toBe(6);
    });

    it("should have empty strings for rows 0, 3, and 5", () => {
      const result = formatNowPlaying("Song", "Artist");
      expect(result[0]).toBe("");
      expect(result[3]).toBe("");
      expect(result[5]).toBe("");
    });

    it("should center 'NOW PLAYING' on row 1", () => {
      const result = formatNowPlaying("Song", "Artist");
      // "NOW PLAYING" is 11 chars, pad = floor((22-11)/2) = 5
      expect(result[1]).toBe("     NOW PLAYING");
    });

    it("should center the uppercase title on row 2", () => {
      const result = formatNowPlaying("Hello", "Artist");
      // "HELLO" is 5 chars, pad = floor((22-5)/2) = 8
      expect(result[2]).toBe("        HELLO");
    });

    it("should center the artist with dash prefix on row 4", () => {
      const result = formatNowPlaying("Song", "Beatles");
      // "- BEATLES" is 9 chars, pad = floor((22-9)/2) = 6
      expect(result[4]).toBe("      - BEATLES");
    });

    it("should convert title to uppercase", () => {
      const result = formatNowPlaying("bohemian rhapsody", "Queen");
      expect(result[2]).toContain("BOHEMIAN RHAPSODY");
    });

    it("should convert artist to uppercase", () => {
      const result = formatNowPlaying("Song", "queen");
      expect(result[4]).toContain("- QUEEN");
    });

    it("should truncate title longer than 22 characters", () => {
      // "ABCDEFGHIJKLMNOPQRSTUVWXYZ" is 26 chars uppercase
      const result = formatNowPlaying("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "Artist");
      // truncate: 22-1=21 chars + "." = "ABCDEFGHIJKLMNOPQRSTU."
      const titleLine = result[2].trim();
      expect(titleLine.length).toBeLessThanOrEqual(22);
      expect(titleLine).toBe("ABCDEFGHIJKLMNOPQRSTU.");
    });

    it("should truncate artist longer than 22 characters", () => {
      const result = formatNowPlaying("Song", "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      // artist truncated: "ABCDEFGHIJKLMNOPQRSTU." then prefixed with "- "
      const artistLine = result[4].trim();
      expect(artistLine).toBe("- ABCDEFGHIJKLMNOPQRSTU.");
    });

    it("should not truncate title of exactly 22 characters", () => {
      const exact22 = "ABCDEFGHIJKLMNOPQRSTUV"; // exactly 22
      const result = formatNowPlaying(exact22, "Artist");
      const titleLine = result[2].trim();
      expect(titleLine).toBe("ABCDEFGHIJKLMNOPQRSTUV");
    });

    it("should not truncate artist of exactly 22 characters", () => {
      const exact22 = "ABCDEFGHIJKLMNOPQRSTUV"; // exactly 22
      const result = formatNowPlaying("Song", exact22);
      const artistLine = result[4].trim();
      expect(artistLine).toBe("- ABCDEFGHIJKLMNOPQRSTUV");
    });

    it("should handle empty title", () => {
      const result = formatNowPlaying("", "Artist");
      expect(result.length).toBe(6);
      // Empty string centered: pad = floor((22-0)/2) = 11
      expect(result[2]).toBe("           ");
    });

    it("should handle empty artist", () => {
      const result = formatNowPlaying("Song", "");
      expect(result.length).toBe(6);
      // "- " is 2 chars, pad = floor((22-2)/2) = 10
      expect(result[4]).toBe("          - ");
    });

    it("should handle both empty", () => {
      const result = formatNowPlaying("", "");
      expect(result.length).toBe(6);
    });

    it("should handle title of exactly 21 characters (no truncation)", () => {
      const title21 = "ABCDEFGHIJKLMNOPQRSTU"; // 21 chars
      const result = formatNowPlaying(title21, "A");
      const titleLine = result[2].trim();
      expect(titleLine).toBe("ABCDEFGHIJKLMNOPQRSTU");
    });

    it("should handle title of exactly 23 characters (truncated)", () => {
      const title23 = "ABCDEFGHIJKLMNOPQRSTUVW"; // 23 chars
      const result = formatNowPlaying(title23, "A");
      const titleLine = result[2].trim();
      expect(titleLine).toBe("ABCDEFGHIJKLMNOPQRSTU.");
      expect(titleLine.length).toBe(22);
    });

    it("should handle single character inputs", () => {
      const result = formatNowPlaying("X", "Y");
      // "X" centered: pad = floor((22-1)/2) = 10
      expect(result[2]).toBe("          X");
      // "- Y" centered: pad = floor((22-3)/2) = 9
      expect(result[4]).toBe("         - Y");
    });
  });
});
