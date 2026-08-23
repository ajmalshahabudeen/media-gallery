export function normalizeFolder(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\\/g, "/").replace(/\/+$/, "").trim();
}

export function folderLabel(folder: string): string {
  const normalized = normalizeFolder(folder);
  if (!normalized || normalized === "." || normalized === "/") return "Root";
  return normalized;
}

export function collectFolderOptions(
  files: { folder?: string }[],
  libraries: { name?: string; path?: string }[] = []
): string[] {
  const set = new Set<string>();
  for (const file of files) {
    const folder = normalizeFolder(file.folder);
    if (folder && folder !== ".") set.add(folder);
  }
  for (const library of libraries) {
    const name = library.name?.trim();
    if (name) set.add(name);
  }
  return [...set].sort((a, b) => folderLabel(a).localeCompare(folderLabel(b)));
}

export function fileInSelectedFolders(
  file: { folder?: string; path?: string },
  selected: string[]
): boolean {
  if (!selected.length) return true;
  const folder = normalizeFolder(file.folder);
  const path = normalizeFolder(file.path);
  return selected.some((raw) => {
    const sel = normalizeFolder(raw);
    if (!sel) return false;
    if (folder === sel || folder.startsWith(`${sel}/`)) return true;
    if (path === sel || path.includes(`/${sel}/`) || path.endsWith(`/${sel}`)) return true;
    return folder.toLowerCase() === sel.toLowerCase();
  });
}

export function applyFolderFilter<T extends { folder?: string; path?: string }>(
  files: T[],
  enabled: boolean,
  selected: string[]
): T[] {
  if (!enabled || selected.length === 0) return files;
  return files.filter((file) => fileInSelectedFolders(file, selected));
}
