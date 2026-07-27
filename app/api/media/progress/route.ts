import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { getIndexingProgress } from "@/lib/progressStore";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progress = await getIndexingProgress();
  return NextResponse.json(progress);
}
