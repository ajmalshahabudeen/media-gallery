import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const rawHandler = toNextJsHandler(auth);

/**
 * Better Auth rejects POSTs with missing/null Origin (common for React Native,
 * some proxies, and sandboxed WebViews). Inject a trusted Origin from the
 * request URL or BETTER_AUTH_URL so login/register work for mobile clients.
 */
function withTrustedOrigin(request: NextRequest): NextRequest {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && origin !== "null") {
    return request;
  }

  const fallback = (
    process.env.BETTER_AUTH_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}` ||
    "http://localhost:38479"
  ).replace(/\/+$/, "");

  const headers = new Headers(request.headers);
  headers.set("origin", fallback);
  if (!referer || referer === "null") {
    headers.set("referer", `${fallback}/`);
  }

  // Clone via NextRequest using only supported init fields
  return new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // Required when forwarding a streaming body in the Fetch/undici runtime
    duplex: "half",
  } as ConstructorParameters<typeof NextRequest>[1]);
}

export async function GET(request: NextRequest) {
  return rawHandler.GET(withTrustedOrigin(request));
}

export async function POST(request: NextRequest) {
  return rawHandler.POST(withTrustedOrigin(request));
}
