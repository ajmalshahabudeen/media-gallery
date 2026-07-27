import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function checkAdminSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user) {
    return { authorized: false, error: "Unauthorized", status: 401, session: null };
  }

  if (session.user.role !== "admin") {
    return { authorized: false, error: "Forbidden: Admin access required", status: 403, session };
  }

  return { authorized: true, error: null, status: 200, session };
}

export async function GET(request: NextRequest) {
  const authCheck = await checkAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const level = searchParams.get("level") || "ALL";
  const type = searchParams.get("type") || "ALL";
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const where: Record<string, unknown> = {};

    if (level !== "ALL") {
      where.level = level;
    }

    if (type !== "ALL") {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { message: { contains: search } },
        { userEmail: { contains: search } },
        { ipAddress: { contains: search } },
        { deviceName: { contains: search } },
        { type: { contains: search } },
      ];
    }

    const logs = await prisma.systemLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    const total = await prisma.systemLog.count({ where });

    return NextResponse.json({ logs, total });
  } catch {
    return NextResponse.json({ error: "Failed to fetch system logs" }, { status: 500 });
  }
}

export async function DELETE() {
  const authCheck = await checkAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    await prisma.systemLog.deleteMany();
    await logger.warn("SYSTEM_LOGS_CLEARED", "Admin cleared all system log records", {
      userEmail: authCheck.session?.user.email,
      userId: authCheck.session?.user.id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 });
  }
}
