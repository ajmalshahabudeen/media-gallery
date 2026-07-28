import { MediaFile } from "../store/useMobileStore";

export interface MediaSection {
  title: string;
  data: MediaFile[];
}

function getDateGroupTitle(dateString: string): string {
  if (!dateString) return "Unknown Date";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown Date";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fileDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (fileDate.getTime() === today.getTime()) {
    return "Today";
  } else if (fileDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  ) {
    return "This Month";
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "long" });
  } else {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
}

function getTypeGroupTitle(type: string): string {
  switch (type) {
    case "image":
      return "📷 Photos";
    case "video":
      return "🎬 Videos";
    case "audio":
      return "🎵 Audio";
    default:
      return "📄 Documents & Files";
  }
}

export function groupMediaFiles(
  files: MediaFile[],
  groupBy: "none" | "folder" | "type" | "date"
): MediaSection[] {
  if (groupBy === "none" || !files.length) {
    return [{ title: "", data: files }];
  }

  const groupsMap = new Map<string, MediaFile[]>();

  files.forEach((file) => {
    let key = "";
    if (groupBy === "folder") {
      key = file.folder || "Root Directory";
    } else if (groupBy === "type") {
      key = getTypeGroupTitle(file.type);
    } else if (groupBy === "date") {
      key = getDateGroupTitle(file.modifiedAt);
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(file);
  });

  const sections: MediaSection[] = [];
  groupsMap.forEach((data, title) => {
    sections.push({ title, data });
  });

  return sections;
}
