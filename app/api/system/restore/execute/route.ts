import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { executeDatabaseRestore, RestorePayload, ConfirmedDriveMapping, MergeStrategy } from "@/lib/backup-restore";

export async function POST(request: NextRequest) {
  const session = await getUserSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      payload,
      confirmedDriveMappings = [],
      mergeStrategy = "smart_merge",
      restoreComponents = {
        favorites: true,
        folders: true,
        users: false,
        logs: false,
      },
    }: {
      payload: RestorePayload;
      confirmedDriveMappings: ConfirmedDriveMapping[];
      mergeStrategy: MergeStrategy;
      restoreComponents: {
        favorites: boolean;
        folders: boolean;
        users: boolean;
        logs: boolean;
      };
    } = body;

    if (!payload) {
      return NextResponse.json({ error: "Missing restore payload" }, { status: 400 });
    }

    const result = await executeDatabaseRestore(payload, {
      currentUserId: session.user.id,
      currentUserEmail: session.user.email,
      isAdmin: session.user.role === "admin",
      mergeStrategy,
      confirmedDriveMappings,
      restoreComponents,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to restore database" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Restore execution failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
