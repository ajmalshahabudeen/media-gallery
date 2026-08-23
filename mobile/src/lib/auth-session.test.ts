import { describe, expect, test } from "bun:test";
import {
  hasLiveBetterAuthSession,
  isAuthNetworkFailure,
  isExplicitUnauthenticated,
  readAuthToken,
} from "./auth-session";

describe("hasLiveBetterAuthSession", () => {
  test("requires both user and session from Better Auth", () => {
    expect(hasLiveBetterAuthSession({ user: { id: "1" }, session: { token: "abc" } })).toBe(true);
    expect(hasLiveBetterAuthSession({ user: { id: "1" } })).toBe(false);
    expect(hasLiveBetterAuthSession({ session: { token: "abc" } })).toBe(false);
    expect(hasLiveBetterAuthSession({})).toBe(false);
  });
});

describe("readAuthToken", () => {
  test("prefers top-level token then session.token", () => {
    expect(readAuthToken({ token: "a", session: { token: "b" } })).toBe("a");
    expect(readAuthToken({ session: { token: "b" } })).toBe("b");
    expect(readAuthToken({})).toBe(null);
  });
});

describe("isExplicitUnauthenticated", () => {
  test("401/403 clear the session", () => {
    expect(isExplicitUnauthenticated(401, { user: { id: "1" } })).toBe(true);
    expect(isExplicitUnauthenticated(403, {})).toBe(true);
  });

  test("200 without user/session is logged out", () => {
    expect(isExplicitUnauthenticated(200, {})).toBe(true);
  });

  test("network-ish statuses are not an explicit logout", () => {
    expect(isExplicitUnauthenticated(0, {})).toBe(false);
    expect(isExplicitUnauthenticated(502, {})).toBe(false);
  });
});

describe("isAuthNetworkFailure", () => {
  test("treats abort and fetch failures as offline", () => {
    expect(isAuthNetworkFailure({ name: "AbortError" })).toBe(true);
    expect(isAuthNetworkFailure({ message: "Network request failed" })).toBe(true);
    expect(isAuthNetworkFailure({ message: "Invalid password" })).toBe(false);
  });
});
