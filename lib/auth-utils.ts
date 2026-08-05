import { NextRequest } from "next/server";
import { headers } from "next/headers";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const normalizedTarget = path.normalize(filePath).toLowerCase();

  for (const folder of userFolders) {
    const normalizedFolder = path.normalize(folder.path).toLowerCase();
    if (
      normalizedTarget === normalizedFolder ||
      normalizedTarget.startsWith(
        normalizedFolder.endsWith(path.sep) ? normalizedFolder : normalizedFolder + path.sep
      )
    ) {
      return true;
    }
    const targetForward = normalizedTarget.replace(/\\/g, "/");
    const folderForward = normalizedFolder.replace(/\\/g, "/");
    if (
      targetForward === folderForward ||
      targetForward.startsWith(folderForward.endsWith("/") ? folderForward : folderForward + "/")
    ) {
      return true;
    }
  }

  return false;
}
