import { DEFAULT_SERVER_URL, getServerUrl, pingServer, setServerUrl } from "./api";

export const GALLERY_PORT = 38479;

export type DiscoverSource = "saved" | "scan" | "default";

export interface DiscoverResult {
  url: string;
  source: DiscoverSource;
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function parseHostPort(url: string): { host: string; port: number; protocol: string } | null {
  try {
    const parsed = new URL(url.includes("://") ? url : `http://${url}`);
    const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : GALLERY_PORT;
    return { host: parsed.hostname, port: Number.isFinite(port) ? port : GALLERY_PORT, protocol: parsed.protocol };
  } catch {
    return null;
  }
}

function ipv4Prefix(ip: string): string | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  if (!parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function lastOctet(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const n = Number(parts[3]);
  return Number.isFinite(n) ? n : null;
}

async function getDeviceIpv4(): Promise<string | null> {
  try {
    const Network = require("expo-network") as {
      getIpAddressAsync?: () => Promise<string>;
    };
    const ip = await Network.getIpAddressAsync?.();
    if (!ip || ip === "0.0.0.0" || ip.startsWith("127.")) return null;
    return ipv4Prefix(ip) ? ip : null;
  } catch {
    return null;
  }
}

async function pingQuick(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base = normalizeBase(url);
    const res = await fetch(`${base}/api/server/ping`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Origin: base,
        Referer: `${base}/`,
      },
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { app?: string; status?: string } | null;
    return data?.app === "Server Gallery" || data?.status === "online";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function octetPriority(preferred: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  const push = (n: number) => {
    if (n >= 1 && n <= 254 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };
  preferred.forEach(push);
  [101, 100, 102, 103, 110, 111, 120, 150, 200, 10, 20, 50, 2, 5].forEach(push);
  for (let n = 1; n <= 254; n++) push(n);
  return out;
}

async function firstHit(
  urls: string[],
  worker: (url: string) => Promise<boolean>,
  concurrency: number,
  deadline: number
): Promise<string | null> {
  let index = 0;
  let found: string | null = null;

  const run = async () => {
    while (index < urls.length && !found && Date.now() < deadline) {
      const url = urls[index++];
      const ok = await worker(url);
      if (ok && !found) found = url;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => run());
  await Promise.all(workers);
  return found;
}

async function collectPrefixes(savedUrl: string): Promise<{ prefixes: string[]; preferredOctets: number[] }> {
  const prefixes: string[] = [];
  const preferredOctets: number[] = [];
  const seen = new Set<string>();

  const addPrefix = (ip: string) => {
    const prefix = ipv4Prefix(ip);
    if (!prefix || seen.has(prefix)) return;
    seen.add(prefix);
    prefixes.push(prefix);
    const octet = lastOctet(ip);
    if (octet != null) preferredOctets.push(octet);
  };

  const saved = parseHostPort(savedUrl);
  if (saved) addPrefix(saved.host);

  const deviceIp = await getDeviceIpv4();
  if (deviceIp) addPrefix(deviceIp);

  // Common home LAN ranges — only as a last resort, capped later.
  ["192.168.1.101", "192.168.0.101"].forEach(addPrefix);

  return { prefixes: prefixes.slice(0, 2), preferredOctets };
}

let inFlight: Promise<DiscoverResult> | null = null;

async function discoverServerUrlOnce(options?: { budgetMs?: number }): Promise<DiscoverResult> {
  const budgetMs = options?.budgetMs ?? 9000;
  const started = Date.now();
  const saved = normalizeBase((await getServerUrl()) || DEFAULT_SERVER_URL);
  const savedParts = parseHostPort(saved);
  const port = savedParts?.port || GALLERY_PORT;

  if (await pingQuick(saved, 1200)) {
    return { url: saved, source: "saved" };
  }

  const { prefixes, preferredOctets } = await collectPrefixes(saved);
  const candidates: string[] = [];
  const seen = new Set<string>();
  const addUrl = (url: string) => {
    const next = normalizeBase(url);
    if (!next || seen.has(next)) return;
    seen.add(next);
    candidates.push(next);
  };

  addUrl(saved);
  addUrl(`http://10.0.2.2:${port}`);

  const octets = octetPriority(preferredOctets);
  for (const prefix of prefixes) {
    for (const octet of octets) {
      addUrl(`http://${prefix}.${octet}:${port}`);
    }
  }

  const remaining = Math.max(800, budgetMs - (Date.now() - started));
  const found = await firstHit(
    candidates,
    (url) => pingQuick(url, 450),
    32,
    Date.now() + remaining
  );

  if (found) {
    if (found !== saved) {
      await setServerUrl(found);
    }
    return { url: found, source: found === saved ? "saved" : "scan" };
  }

  // Last-chance longer ping of the existing URL — keep current logic intact.
  const fallback = await pingServer(saved);
  if (fallback.success) {
    return { url: saved, source: "saved" };
  }

  return { url: saved, source: "default" };
}

/**
 * Probe the LAN for a Server Gallery instance on port 38479.
 * Falls back to the saved / default URL when nothing answers.
 * Concurrent callers share one in-flight scan so boot cannot race itself.
 */
export function discoverServerUrl(options?: { budgetMs?: number }): Promise<DiscoverResult> {
  if (!inFlight) {
    inFlight = discoverServerUrlOnce(options).finally(() => {
      setTimeout(() => {
        inFlight = null;
      }, 2500);
    });
  }
  return inFlight;
}
