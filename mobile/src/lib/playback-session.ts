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
  onExit?: (position: number, index: number) => void;
};

let session: PlaybackSession | null = null;

export function setPlaybackSession(next: PlaybackSession | null): void {
  session = next;
}

export function getPlaybackSession(): PlaybackSession | null {
  return session;
}

export function updatePlaybackSession(partial: Partial<PlaybackSession>): void {
  if (!session) return;
  session = { ...session, ...partial };
}
