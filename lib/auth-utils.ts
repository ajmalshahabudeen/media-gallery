import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCanonicalPath } from "@/lib/utils";

export async function getUserSession(request?: NextRequest) {
  const reqHeaders = new Headers(await headers());

  if (request) {
    const { searchParams } = new URL(request.url);
    const tokenParam = searchParams.get("token");
    if (tokenParam && !reqHeaders.get("cookie")?.includes("better-auth.session_token")) {
      reqHeaders.set("cookie", `better-auth.session_token=${tokenParam}`);
      if (!reqHeaders.get("authorization")) {
        reqHeaders.set("authorization", `Bearer ${tokenParam}`);
      }
    }
  }

  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

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
