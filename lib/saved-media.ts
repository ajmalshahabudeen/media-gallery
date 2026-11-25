import { prisma } from "@/lib/prisma";

export const DEFAULT_SAVE_FOLDER_NAME = "Main Save";

export interface SaveMediaInput {
  path: string;
  name?: string;
  folder?: string;
  type?: string;
  extension?: string;
  size?: number;
  mimeType?: string;
  modifiedAt?: string | Date;
}

export interface SaveFolderDTO {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  previewPaths: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedMediaDTO {
  id: string;
  path: string;
  name: string;
  folder: string;
  type: "image" | "video" | "audio" | "other";
  extension: string;
  size: number;
  mimeType: string;
  modifiedAt: string;
  createdAt: string;
  folderIds: string[];
}

function normalizeMediaType(type?: string): "image" | "video" | "audio" | "other" {
  if (type === "image" || type === "video" || type === "audio") return type;
  return "other";
}

function buildMediaData(userId: string, input: SaveMediaInput) {
  const nameFromPath = input.path.split(/[/\\]/).pop() || "Media";
  return {
    userId,
    path: input.path,
    name: input.name || nameFromPath,
    folder: input.folder || "",
    type: input.type || "video",
    extension: input.extension || "",
    size: typeof input.size === "number" && Number.isFinite(input.size) ? input.size : 0,
    mimeType: input.mimeType || "video/mp4",
    modifiedAt: input.modifiedAt ? new Date(input.modifiedAt) : new Date(),
  };
}

/**
 * Ensures the user always has the virtual default "Main Save" folder in SQLite.
 * Purely database-backed; never touches the host filesystem.
 */
export async function ensureDefaultSaveFolder(userId: string) {
  const existingDefault = await prisma.saveFolder.findFirst({
    where: { userId, isDefault: true },
  });
  if (existingDefault) return existingDefault;

  return prisma.saveFolder.upsert({
    where: {
      userId_name: {
        userId,
        name: DEFAULT_SAVE_FOLDER_NAME,
      },
    },
    update: { isDefault: true },
    create: {
      userId,
      name: DEFAULT_SAVE_FOLDER_NAME,
      isDefault: true,
    },
  });
}

export async function getSavedStateForUser(
  userId: string,
  filterFolderId?: string | null
): Promise<{
  defaultFolderId: string;
  folders: SaveFolderDTO[];
  items: SavedMediaDTO[];
}> {
  const defaultFolder = await ensureDefaultSaveFolder(userId);

  const [rawFolders, rawItems] = await Promise.all([
    prisma.saveFolder.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: { createdAt: "desc" },
          include: {
            savedMedia: {
              select: { path: true },
            },
          },
        },
      },
    }),
    prisma.savedMedia.findMany({
      where: filterFolderId
        ? {
            userId,
            folders: { some: { saveFolderId: filterFolderId } },
          }
        : { userId },
      orderBy: { createdAt: "desc" },
      include: {
        folders: {
          select: { saveFolderId: true },
        },
      },
    }),
  ]);

  const folders: SaveFolderDTO[] = rawFolders.map((f) => ({
    id: f.id,
    name: f.name,
    isDefault: f.isDefault,
    itemCount: f.items.length,
    previewPaths: f.items.slice(0, 4).map((link) => link.savedMedia.path),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  const items: SavedMediaDTO[] = rawItems.map((item) => ({
    id: item.id,
    path: item.path,
    name: item.name,
    folder: item.folder,
    type: normalizeMediaType(item.type),
    extension: item.extension,
    size: item.size,
    mimeType: item.mimeType,
    modifiedAt: item.modifiedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    folderIds: item.folders.map((link) => link.saveFolderId),
  }));

  return {
    defaultFolderId: defaultFolder.id,
    folders,
    items,
  };
}

export async function quickSaveToDefaultFolder(userId: string, input: SaveMediaInput) {
  const defaultFolder = await ensureDefaultSaveFolder(userId);
  const mediaData = buildMediaData(userId, input);

  const existing = await prisma.savedMedia.findUnique({
    where: { userId_path: { userId, path: input.path } },
    include: { folders: { select: { saveFolderId: true } } },
  });

  if (existing && existing.folders.length > 0) {
    return {
      saved: true,
      alreadySaved: true,
      defaultFolderId: defaultFolder.id,
      folderIds: existing.folders.map((f) => f.saveFolderId),
    };
  }

  const savedMedia = existing
    ? existing
    : await prisma.savedMedia.create({ data: mediaData });

  await prisma.savedMediaFolder.upsert({
    where: {
      savedMediaId_saveFolderId: {
        savedMediaId: savedMedia.id,
        saveFolderId: defaultFolder.id,
      },
    },
    update: {},
    create: {
      savedMediaId: savedMedia.id,
      saveFolderId: defaultFolder.id,
    },
  });

  return {
    saved: true,
    alreadySaved: false,
    defaultFolderId: defaultFolder.id,
    folderIds: [defaultFolder.id],
  };
}

export async function toggleMediaInSaveFolder(
  userId: string,
  input: SaveMediaInput,
  saveFolderId: string,
  opts?: { moveFromDefault?: boolean }
) {
  const defaultFolder = await ensureDefaultSaveFolder(userId);
  const targetFolder = await prisma.saveFolder.findFirst({
    where: { id: saveFolderId, userId },
  });

  if (!targetFolder) {
    throw new Error("Save folder not found");
  }

  const mediaData = buildMediaData(userId, input);

  return prisma.$transaction(async (tx) => {
    const savedMedia = await tx.savedMedia.upsert({
      where: { userId_path: { userId, path: input.path } },
      update: {
        name: mediaData.name,
        folder: mediaData.folder,
        type: mediaData.type,
        extension: mediaData.extension,
        size: mediaData.size,
        mimeType: mediaData.mimeType,
      },
      create: mediaData,
    });

    const existingLink = await tx.savedMediaFolder.findUnique({
      where: {
        savedMediaId_saveFolderId: {
          savedMediaId: savedMedia.id,
          saveFolderId: targetFolder.id,
        },
      },
    });

    if (existingLink) {
      await tx.savedMediaFolder.delete({ where: { id: existingLink.id } });
    } else {
      await tx.savedMediaFolder.create({
        data: {
          savedMediaId: savedMedia.id,
          saveFolderId: targetFolder.id,
        },
      });

      // When moving from quick-save ("Main Save") into a chosen custom folder,
      // remove the automatic default link unless the target IS the default folder.
      if (opts?.moveFromDefault && !targetFolder.isDefault) {
        await tx.savedMediaFolder.deleteMany({
          where: {
            savedMediaId: savedMedia.id,
            saveFolderId: defaultFolder.id,
          },
        });
      }
    }

    const remaining = await tx.savedMediaFolder.findMany({
      where: { savedMediaId: savedMedia.id },
      select: { saveFolderId: true },
    });

    if (remaining.length === 0) {
      await tx.savedMedia.delete({ where: { id: savedMedia.id } });
      return { saved: false, folderIds: [] as string[] };
    }

    return {
      saved: true,
      folderIds: remaining.map((r) => r.saveFolderId),
    };
  });
}

export async function setMediaSaveFolders(
  userId: string,
  input: SaveMediaInput,
  folderIds: string[]
) {
  const uniqueIds = [...new Set(folderIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    await unsaveMedia(userId, input.path);
    return { saved: false, folderIds: [] as string[] };
  }

  const validFolders = await prisma.saveFolder.findMany({
    where: { userId, id: { in: uniqueIds } },
    select: { id: true },
  });
  const validIds = validFolders.map((f) => f.id);
  if (validIds.length === 0) {
    throw new Error("No valid save folders selected");
  }

  const mediaData = buildMediaData(userId, input);

  return prisma.$transaction(async (tx) => {
    const savedMedia = await tx.savedMedia.upsert({
      where: { userId_path: { userId, path: input.path } },
      update: {
        name: mediaData.name,
        folder: mediaData.folder,
        type: mediaData.type,
        extension: mediaData.extension,
        size: mediaData.size,
        mimeType: mediaData.mimeType,
      },
      create: mediaData,
    });

    await tx.savedMediaFolder.deleteMany({
      where: { savedMediaId: savedMedia.id },
    });

    await tx.savedMediaFolder.createMany({
      data: validIds.map((saveFolderId) => ({
        savedMediaId: savedMedia.id,
        saveFolderId,
      })),
    });

    return { saved: true, folderIds: validIds };
  });
}

export async function unsaveMedia(userId: string, mediaPath: string) {
  await prisma.savedMedia.deleteMany({
    where: { userId, path: mediaPath },
  });
  return { saved: false, folderIds: [] as string[] };
}
