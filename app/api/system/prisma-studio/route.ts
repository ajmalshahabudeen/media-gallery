import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  getStudioStatus,
  startStudio,
  stopStudio,
} from "@/lib/prisma-studio-manager";
import { logger } from "@/lib/logger";

async function checkSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user) {
    return { authorized: false, error: "Unauthorized", status: 401, session: null };
  }

  return { authorized: true, error: null, status: 200, session };
}

export async function GET() {
  const authCheck = await checkSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const status = await getStudioStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error("[Prisma Studio Status Error]:", err);
    return NextResponse.json(
      { error: "Failed to get Prisma Studio status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await checkSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "start";

    if (action === "stop") {
      const result = await stopStudio();
      await logger.info(
        "PRISMA_STUDIO_STOP",
        "Prisma Studio stopped via settings",
        {
          userEmail: authCheck.session?.user.email,
          userId: authCheck.session?.user.id,
        }
      );
      return NextResponse.json(result);
    }

    if (action === "start") {
      const result = await startStudio();
      await logger.info(
        "PRISMA_STUDIO_START",
        result.success
          ? "Prisma Studio started on port 5555"
          : `Prisma Studio failed to start: ${result.error}`,
        {
          userEmail: authCheck.session?.user.email,
          userId: authCheck.session?.user.id,
          metadata: { port: result.port, success: result.success },
        }
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Prisma Studio Action Error]:", err);
    return NextResponse.json(
      { error: "Failed to perform Prisma Studio action" },
      { status: 500 }
    );
  }
}
