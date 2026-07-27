import { NextResponse } from "next/server";
import { getIndexingProgress } from "@/lib/progressStore";

export async function GET() {
  const progress = await getIndexingProgress();
  return NextResponse.json(progress);
}
