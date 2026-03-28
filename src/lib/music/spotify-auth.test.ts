import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initiateSpotifyAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getStoredTokens,
  storeTokens,
  clearTokens,
  isAuthenticated,
  getValidToken,
} from "@/lib/music/spotify-auth";

describe("spotify-auth", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    // Mock window.location
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });

    // Mock crypto.getRandomValues
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      const arr = array as Uint8Array;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i % 62; // Deterministic values for testing
      }
      return array;
    });

    // Mock crypto.subtle.digest
    vi.spyOn(crypto.subtle, "digest").mockResolvedValue(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).buffer
    );
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  describe("initiateSpotifyAuth", () => {
    it("stores code verifier in localStorage and redirects to Spotify auth", async () => {
      await initiateSpotifyAuth("http://localhost:3000/callback");

      // Should have stored a code verifier
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "spotify_code_verifier",
        expect.any(String)
      );

      // Should redirect to Spotify authorize URL
      expect(window.location.href).toContain("https://accounts.spotify.com/authorize?");
      expect(window.location.href).toContain("response_type=code");
      expect(window.location.href).toContain("code_challenge_method=S256");
      expect(window.location.href).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback");
      expect(window.location.href).toContain("scope=streaming+user-modify-playback-state+user-read-playback-state+user-read-currently-playing");
    });

    it("generates a 64-character code verifier", async () => {
      await initiateSpotifyAuth("http://localhost:3000/callback");

      const setItemCalls = vi.mocked(localStorage.setItem).mock.calls;
      const verifierCall = setItemCalls.find(
        (call) => call[0] === "spotify_code_verifier"
      );
      expect(verifierCall).toBeDefined();
      expect(verifierCall![1]).toHaveLength(64);
    });

    it("calls crypto.subtle.digest with SHA-256 and a typed array", async () => {
      await initiateSpotifyAuth("http://localhost:3000/callback");

      expect(crypto.subtle.digest).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(crypto.subtle.digest).mock.calls[0];
      expect(callArgs[0]).toBe("SHA-256");
      // jsdom realm may differ, so check the data duck-type instead of instanceof
      const data = callArgs[1] as Uint8Array;
      expect(data.byteLength).toBeGreaterThan(0);
      expect(data.constructor.name).toBe("Uint8Array");
    });
  });

  describe("exchangeCodeForToken", () => {
    it("exchanges auth code for tokens successfully", async () => {
      localStorage.setItem("spotify_code_verifier", "test-verifier");

      const mockTokenData = {
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_in: 3600,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenData),
      });

      const result = await exchangeCodeForToken("auth-code", "http://localhost:3000/callback");

      expect(fetch).toHaveBeenCalledWith(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: expect.any(URLSearchParams),
        }
      );

      expect(result).toEqual(mockTokenData);
      // Should clean up code verifier
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_code_verifier");
    });

    it("uses stored code verifier from localStorage", async () => {
      localStorage.setItem("spotify_code_verifier", "my-verifier");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
      });

      await exchangeCodeForToken("code", "http://localhost/cb");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall[1]!.body as URLSearchParams;
      expect(body.get("code_verifier")).toBe("my-verifier");
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("code");
      expect(body.get("redirect_uri")).toBe("http://localhost/cb");
    });

    it("uses empty string when no code verifier in localStorage", async () => {
      // localStorage is empty, so getItem returns null -> falls back to ""
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
      });

      await exchangeCodeForToken("code", "http://localhost/cb");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall[1]!.body as URLSearchParams;
      expect(body.get("code_verifier")).toBe("");
    });

    it("throws error when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(
        exchangeCodeForToken("bad-code", "http://localhost/cb")
      ).rejects.toThrow("Failed to exchange code for token");
    });
  });

  describe("refreshAccessToken", () => {
    it("refreshes token successfully", async () => {
      const mockData = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await refreshAccessToken("old-refresh-token");

      expect(fetch).toHaveBeenCalledWith(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: expect.any(URLSearchParams),
        }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall[1]!.body as URLSearchParams;
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("old-refresh-token");

      expect(result).toEqual(mockData);
    });

    it("throws error when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(refreshAccessToken("bad-token")).rejects.toThrow(
        "Failed to refresh token"
      );
    });
  });

  describe("getStoredTokens", () => {
    it("returns tokens from localStorage", () => {
      localStorage.setItem("spotify_access_token", "access-token");
      localStorage.setItem("spotify_refresh_token", "refresh-token");
      localStorage.setItem("spotify_expires_at", "1234567890000");

      const result = getStoredTokens();

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1234567890000,
      });
    });

    it("returns null values and 0 expiresAt when nothing stored", () => {
      const result = getStoredTokens();

      expect(result).toEqual({
        accessToken: null,
        refreshToken: null,
        expiresAt: 0,
      });
    });
  });

  describe("storeTokens", () => {
    it("stores tokens and computed expiry in localStorage", () => {
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000000);

      storeTokens("access", "refresh", 3600);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "spotify_access_token",
        "access"
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "spotify_refresh_token",
        "refresh"
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "spotify_expires_at",
        String(1000000 + 3600 * 1000)
      );

      nowSpy.mockRestore();
    });
  });

  describe("clearTokens", () => {
    it("removes all spotify keys from localStorage", () => {
      localStorage.setItem("spotify_access_token", "a");
      localStorage.setItem("spotify_refresh_token", "r");
      localStorage.setItem("spotify_expires_at", "9999");
      localStorage.setItem("spotify_code_verifier", "v");

      clearTokens();

      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_access_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_refresh_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_expires_at");
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_code_verifier");
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when access token exists and not expired", () => {
      localStorage.setItem("spotify_access_token", "token");
      localStorage.setItem("spotify_expires_at", String(Date.now() + 600000));

      expect(isAuthenticated()).toBe(true);
    });

    it("returns false when no access token", () => {
      localStorage.setItem("spotify_expires_at", String(Date.now() + 600000));

      expect(isAuthenticated()).toBe(false);
    });

    it("returns false when token is expired", () => {
      localStorage.setItem("spotify_access_token", "token");
      localStorage.setItem("spotify_expires_at", String(Date.now() - 1000));

      expect(isAuthenticated()).toBe(false);
    });

    it("returns false when expiresAt is 0 (default)", () => {
      localStorage.setItem("spotify_access_token", "token");

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("getValidToken", () => {
    it("returns null when no access token stored", async () => {
      const result = await getValidToken();
      expect(result).toBeNull();
    });

    it("returns null when no refresh token stored", async () => {
      localStorage.setItem("spotify_access_token", "access");
      // No refresh token

      const result = await getValidToken();
      expect(result).toBeNull();
    });

    it("returns existing token when not near expiry", async () => {
      localStorage.setItem("spotify_access_token", "valid-token");
      localStorage.setItem("spotify_refresh_token", "refresh-token");
      // Set expiry well into the future (more than 60s buffer)
      localStorage.setItem(
        "spotify_expires_at",
        String(Date.now() + 120000)
      );

      const result = await getValidToken();
      expect(result).toBe("valid-token");
    });

    it("refreshes token when within 60-second expiry buffer", async () => {
      localStorage.setItem("spotify_access_token", "old-token");
      localStorage.setItem("spotify_refresh_token", "refresh-token");
      // Expires in 30 seconds (within the 60-second buffer)
      localStorage.setItem(
        "spotify_expires_at",
        String(Date.now() + 30000)
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-token",
            refresh_token: "new-refresh",
            expires_in: 3600,
          }),
      });

      const result = await getValidToken();
      expect(result).toBe("new-token");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "spotify_access_token",
        "new-token"
      );
    });

    it("uses existing refresh token when new one is not returned", async () => {
      localStorage.setItem("spotify_access_token", "old-token");
      localStorage.setItem("spotify_refresh_token", "original-refresh");
      localStorage.setItem("spotify_expires_at", String(Date.now() - 1000));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "refreshed-token",
            // No refresh_token in response
            expires_in: 3600,
          }),
      });

      const result = await getValidToken();
      expect(result).toBe("refreshed-token");
      // Should store original refresh token since response didn't include one
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "spotify_refresh_token",
        "original-refresh"
      );
    });

    it("clears tokens and returns null when refresh fails", async () => {
      localStorage.setItem("spotify_access_token", "expired-token");
      localStorage.setItem("spotify_refresh_token", "bad-refresh");
      localStorage.setItem("spotify_expires_at", String(Date.now() - 1000));

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await getValidToken();
      expect(result).toBeNull();
      // Should have cleared tokens
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_access_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_refresh_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_expires_at");
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_code_verifier");
    });

    it("clears tokens and returns null when refresh throws", async () => {
      localStorage.setItem("spotify_access_token", "expired-token");
      localStorage.setItem("spotify_refresh_token", "bad-refresh");
      localStorage.setItem("spotify_expires_at", String(Date.now() - 1000));

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await getValidToken();
      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith("spotify_access_token");
    });
  });
});
