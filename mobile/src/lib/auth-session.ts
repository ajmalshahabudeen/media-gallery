export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string | null;
};

export function readAuthToken(data: {
  token?: string;
  session?: { token?: string } | null;
} | null | undefined): string | null {
  const token = data?.token || data?.session?.token;
  return token ? String(token) : null;
}

export function hasLiveBetterAuthSession(data: {
  user?: AuthUser | null;
  session?: { token?: string } | null;
} | null | undefined): boolean {
  return Boolean(data?.user && data?.session);
}

export function isExplicitUnauthenticated(status: number, data: { user?: unknown; session?: unknown } | null | undefined): boolean {
  if (status === 401 || status === 403) return true;
  if (status >= 200 && status < 300 && !data?.user && !data?.session) return true;
  return false;
}

export function isAuthNetworkFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return true;
  const name = "name" in err ? String((err as { name?: string }).name) : "";
  const message = "message" in err ? String((err as { message?: string }).message) : "";
  return (
    name === "AbortError" ||
    /network|failed|abort|timeout|unreachable|refused/i.test(message)
  );
}
