import { describe, it, expect } from "vitest";
import { encodeConfig, decodeConfig } from "@/lib/config/url-config";
import type { TVConfig } from "@/lib/config/url-config";

const DEFAULTS: TVConfig = {
  theme: "dark",
  flipSpeed: 160,
  staggerDelay: 20,
  rotationInterval: 15,
  volume: 0.7,
  isMuted: false,
};

describe("url-config", () => {
  describe("encodeConfig", () => {
    it("should return a non-empty string", () => {
      const encoded = encodeConfig({});
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("should produce base64url-safe characters only", () => {
      const encoded = encodeConfig({ theme: "light", volume: 0.3 });
      // base64url should not contain +, /, or trailing =
      expect(encoded).not.toMatch(/[+/=]/);
      // Should only contain alphanumeric, dash, underscore
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should merge partial config with defaults", () => {
      const encoded = encodeConfig({ theme: "light" });
      const decoded = decodeConfig(encoded);
      expect(decoded.theme).toBe("light");
      expect(decoded.flipSpeed).toBe(DEFAULTS.flipSpeed);
      expect(decoded.staggerDelay).toBe(DEFAULTS.staggerDelay);
      expect(decoded.rotationInterval).toBe(DEFAULTS.rotationInterval);
      expect(decoded.volume).toBe(DEFAULTS.volume);
      expect(decoded.isMuted).toBe(DEFAULTS.isMuted);
    });

    it("should encode empty partial config as defaults", () => {
      const encoded = encodeConfig({});
      const decoded = decodeConfig(encoded);
      expect(decoded).toEqual(DEFAULTS);
    });

    it("should encode all fields when provided", () => {
      const full: TVConfig = {
        theme: "light",
        flipSpeed: 200,
        staggerDelay: 30,
        rotationInterval: 10,
        volume: 0.5,
        isMuted: true,
      };
      const encoded = encodeConfig(full);
      const decoded = decodeConfig(encoded);
      expect(decoded).toEqual(full);
    });
  });

  describe("decodeConfig", () => {
    it("should roundtrip encode -> decode for full config", () => {
      const config: TVConfig = {
        theme: "light",
        flipSpeed: 100,
        staggerDelay: 5,
        rotationInterval: 30,
        volume: 1.0,
        isMuted: true,
      };
      const encoded = encodeConfig(config);
      const decoded = decodeConfig(encoded);
      expect(decoded).toEqual(config);
    });

    it("should roundtrip encode -> decode for partial config (merged with defaults)", () => {
      const partial = { volume: 0.3 };
      const encoded = encodeConfig(partial);
      const decoded = decodeConfig(encoded);
      expect(decoded.volume).toBe(0.3);
      expect(decoded.theme).toBe("dark");
    });

    it("should return defaults for empty string", () => {
      // atob("") throws, so catch block returns DEFAULTS
      const decoded = decodeConfig("");
      expect(decoded).toEqual(DEFAULTS);
    });

    it("should return defaults for malformed base64", () => {
      const decoded = decodeConfig("!!!not-valid-base64!!!");
      expect(decoded).toEqual(DEFAULTS);
    });

    it("should return defaults for valid base64 but invalid JSON", () => {
      // btoa("not json") = "bm90IGpzb24="
      const encoded = btoa("not json")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const decoded = decodeConfig(encoded);
      expect(decoded).toEqual(DEFAULTS);
    });

    it("should handle base64url with replaced characters", () => {
      // Manually create a config with characters that would be + and / in standard base64
      const config: TVConfig = {
        theme: "dark",
        flipSpeed: 160,
        staggerDelay: 20,
        rotationInterval: 15,
        volume: 0.7,
        isMuted: false,
      };
      const encoded = encodeConfig(config);
      // Decode should work correctly
      const decoded = decodeConfig(encoded);
      expect(decoded).toEqual(config);
    });

    it("should restore padding correctly for base64 decoding", () => {
      // Test with a config that produces a base64 string whose length is not a multiple of 4
      const config = { theme: "light" as const, flipSpeed: 999, volume: 0.12345 };
      const encoded = encodeConfig(config);
      // The encode strips trailing =, decode should restore them
      const decoded = decodeConfig(encoded);
      expect(decoded.theme).toBe("light");
      expect(decoded.flipSpeed).toBe(999);
    });

    it("should merge partial decoded JSON with defaults", () => {
      // Encode only a partial config in the JSON
      const json = JSON.stringify({ theme: "light" });
      const encoded = btoa(json)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const decoded = decodeConfig(encoded);
      expect(decoded.theme).toBe("light");
      expect(decoded.flipSpeed).toBe(DEFAULTS.flipSpeed);
      expect(decoded.volume).toBe(DEFAULTS.volume);
    });

    it("should handle base64 strings that need 1 padding character", () => {
      // "ab" in base64 is "YWI=" (length 4, 1 pad char stripped -> "YWI" length 3)
      // This is invalid JSON so we get defaults, but the padding restoration path is tested
      const decoded = decodeConfig("YWI");
      expect(decoded).toEqual(DEFAULTS);
    });

    it("should handle base64 strings that need 2 padding characters", () => {
      // "a" in base64 is "YQ==" (length 4, 2 pad chars stripped -> "YQ" length 2)
      const decoded = decodeConfig("YQ");
      expect(decoded).toEqual(DEFAULTS);
    });

    it("should handle dark theme roundtrip", () => {
      const encoded = encodeConfig({ theme: "dark" });
      const decoded = decodeConfig(encoded);
      expect(decoded.theme).toBe("dark");
    });

    it("should handle extreme numeric values", () => {
      const config: TVConfig = {
        theme: "dark",
        flipSpeed: 0,
        staggerDelay: 0,
        rotationInterval: 0,
        volume: 0,
        isMuted: false,
      };
      const encoded = encodeConfig(config);
      const decoded = decodeConfig(encoded);
      expect(decoded).toEqual(config);
    });
  });
});
