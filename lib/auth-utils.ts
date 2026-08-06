import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCanonicalPath } from "@/lib/utils";

export async function getUserSession(request?: NextRequest) {
  const reqHeaders = new Headers(await headers());

  let tokenParam: string | null = null;
  if (request) {
    const { searchParams } = new URL(request.url);
    tokenParam = searchParams.get("token");
    if (tokenParam) {
      if (!reqHeaders.get("cookie")?.includes("better-auth.session_token")) {
        reqHeaders.set("cookie", `better-auth.session_token=${tokenParam}`);
      }
      if (!reqHeaders.get("authorization")) {
        reqHeaders.set("authorization", `Bearer ${tokenParam}`);
      }
    }
  }

  let session = await auth.api.getSession({
    headers: reqHeaders,
  });

  // Fallback: Query Prisma session table directly for token authentication.
  // Crucial for native mobile video / audio stream playback where native players (ExoPlayer/AVPlayer)
  // pass ?token=... in URL query string or Bearer header without browser cookies.
  if (!session) {
    let rawToken = tokenParam;
    if (!rawToken && request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        rawToken = authHeader.substring(7).trim();
      }
    }
    if (rawToken) {
      try {
        const dbSession = await prisma.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        if (dbSession && dbSession.expiresAt > new Date()) {
          session = {
            session: {
              id: dbSession.id,
              userId: dbSession.userId,
              expiresAt: dbSession.expiresAt,
              createdAt: dbSession.createdAt,
              updatedAt: dbSession.updatedAt,
              token: dbSession.token,
              ipAddress: dbSession.ipAddress,
              userAgent: dbSession.userAgent,
            },
            user: dbSession.user,
          };
        }
      } catch {
        // ignore
      }
    }
  }

  return session;
}

export async function isPathAuthorized(
  filePath: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  if (isAdmin) return true;
  if (!filePath || !userId) return false;

  const userFolders = await prisma.mediaFolder.findMany({
    where: { userId },
    select: { path: true },
  });

  if (userFolders.length === 0) return false;

  const canonicalTarget = normalizeCanonicalPath(filePath);

  for (const folder of userFolders) {
    const canonicalFolder = normalizeCanonicalPath(folder.path);
    if (
      canonicalTarget === canonicalFolder ||
      canonicalTarget.startsWith(
        canonicalFolder.endsWith("/") ? canonicalFolder : canonicalFolder + "/"
      )
    ) {
      return true;
    }
  }

  return false;
}
