import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { image, name } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(image !== undefined && { image }),
        ...(name !== undefined && { name }),
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
