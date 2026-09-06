export type PlaybackItem = {
  uri: string;
  title: string;
};

type PlaybackSession = {
  items: PlaybackItem[];
  index: number;
  startAt: number;
  muted: boolean;
  rate: number;
  onIndexChange?: (index: number) => void;
};

let session: PlaybackSession | null = null;
let resume: { uri: string; position: number } | null = null;
let landscapeCooldownUntil = 0;

export function setPlaybackSession(next: PlaybackSession | null): void {
  session = next;
  resume = null;
}

export function finishPlaybackSession(position: number, index: number): void {
  const item = session?.items[index];
  resume = item ? { uri: item.uri, position } : null;
  session = null;
}

export function takePlaybackResume(uri: string): { uri: string; position: number } | null {
  if (resume?.uri !== uri) return null;
  const result = resume;
  resume = null;
  return result;
}

export function getPlaybackSession(): PlaybackSession | null {
  return session;
}

export function updatePlaybackSession(partial: Partial<PlaybackSession>): void {
  if (!session) return;
  session = { ...session, ...partial };
}

export function armLandscapeCooldown(ms = 900): void {
  landscapeCooldownUntil = Date.now() + ms;
}

export function shouldIgnoreLandscapeOpen(): boolean {
  return !!session || Date.now() < landscapeCooldownUntil;
}
