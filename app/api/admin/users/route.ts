import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Verify current user is admin
 */
async function checkAdminSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user) {
    return { authorized: false, error: "Unauthorized", status: 401, session: null };
  }

  // Check if role is admin
  if (session.user.role !== "admin") {
    return { authorized: false, error: "Forbidden: Admin access required", status: 403, session };
  }

  return { authorized: true, error: null, status: 200, session };
}

export async function GET() {
  const authCheck = await checkAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            mediaFolders: true,
            sessions: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await checkAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const newUser = await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role: role || "user",
      },
      headers: await headers(),
    });

    await logger.info("USER_CREATED", `Admin created new user: ${email} (${role || "user"})`, {
      userEmail: authCheck.session?.user.email,
      userId: authCheck.session?.user.id,
      metadata: { createdUserEmail: email, role: role || "user" },
    });

    return NextResponse.json({ user: newUser });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const authCheck = await checkAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { userId, role, banned, banReason } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (role !== undefined) {
      await auth.api.setRole({
        body: {
          userId,
          role,
        },
        headers: await headers(),
      });
    }

    if (banned !== undefined) {
      if (banned) {
        await auth.api.banUser({
          body: {
            userId,
            banReason: banReason || "Banned by administrator",
          },
          headers: await headers(),
        });
      } else {
        await auth.api.unbanUser({
          body: {
            userId,
          },
          headers: await headers(),
        });
      }
    }

    await logger.info("USER_UPDATED", `Admin updated user [${userId}]`, {
      userEmail: authCheck.session?.user.email,
      userId: authCheck.session?.user.id,
      metadata: { targetUserId: userId, role, banned, banReason },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const authCheck = await checkAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === authCheck.session?.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await auth.api.removeUser({
      body: {
        userId,
      },
      headers: await headers(),
    });

    await logger.warn("USER_DELETED", `Admin deleted user [${userId}]`, {
      userEmail: authCheck.session?.user.email,
      userId: authCheck.session?.user.id,
      metadata: { deletedUserId: userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }
}
