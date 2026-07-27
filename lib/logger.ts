import { prisma } from "@/lib/prisma";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogDetails {
  type: string;
  message: string;
  userEmail?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
  status?: "SUCCESS" | "FAILURE" | "WARNING" | string;
  metadata?: Record<string, unknown> | string | null;
  attemptCount?: number;
}

/**
 * Parses user agent string to extract a clean device & browser name
 */
export function parseDeviceName(userAgent?: string | null): string {
  if (!userAgent) return "Unknown Device";

  let os = "Unknown OS";
  if (/windows nt 10/i.test(userAgent)) os = "Windows 10/11";
  else if (/windows/i.test(userAgent)) os = "Windows";
  else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
  else if (/linux/i.test(userAgent)) os = "Linux";

  let browser = "Browser";
  if (/edg/i.test(userAgent)) browser = "Edge";
  else if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent)) browser = "Safari";

  return `${browser} on ${os}`;
}

/**
 * ANSI Color helpers for informative server terminal console output
 */
const colors = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  blueBg: "\x1b[44m\x1b[37m",
  redBg: "\x1b[41m\x1b[37m",
  yellowBg: "\x1b[43m\x1b[30m",
};

/**
 * Format timestamp for console output
 */
function getConsoleTimestamp(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

class ServerLogger {
  /**
   * Log entry to both server terminal console and database
   */
  async log(level: LogLevel, details: LogDetails) {
    const timestamp = getConsoleTimestamp();
    const deviceName = details.deviceName || parseDeviceName(details.userAgent);
    const metaStr =
      typeof details.metadata === "object" && details.metadata !== null
        ? JSON.stringify(details.metadata)
        : (details.metadata as string) || null;

    // 1. Informative Server Terminal Console Output
    let levelColor = colors.cyan;
    if (level === "WARN") levelColor = colors.yellow;
    if (level === "ERROR") levelColor = colors.red;

    const userTag = details.userEmail ? ` [User: ${details.userEmail}]` : "";
    const ipTag = details.ipAddress ? ` [IP: ${details.ipAddress}]` : "";
    const deviceTag = deviceName ? ` [Device: ${deviceName}]` : "";

    const consoleMsg = `${colors.gray}[${timestamp}]${colors.reset} ${levelColor}${colors.bold}[${level}]${colors.reset} ${colors.cyan}[${details.type}]${colors.reset} ${details.message}${colors.gray}${userTag}${ipTag}${deviceTag}${colors.reset}`;

    if (level === "ERROR") {
      console.error(consoleMsg);
    } else if (level === "WARN") {
      console.warn(consoleMsg);
    } else {
      console.log(consoleMsg);
    }

    // 2. Persist to Database asynchronously
    try {
      await prisma.systemLog.create({
        data: {
          level,
          type: details.type,
          message: details.message,
          userEmail: details.userEmail || null,
          userId: details.userId || null,
          ipAddress: details.ipAddress || null,
          deviceName,
          userAgent: details.userAgent || null,
          status: details.status || (level === "ERROR" ? "FAILURE" : "SUCCESS"),
          metadata: metaStr,
          attemptCount: details.attemptCount || 1,
        },
      });
    } catch {
      // Ignore DB log persistence errors to prevent blocking main requests
    }
  }

  info(type: string, message: string, details?: Partial<LogDetails>) {
    return this.log("INFO", { type, message, ...details });
  }

  warn(type: string, message: string, details?: Partial<LogDetails>) {
    return this.log("WARN", { type, message, ...details });
  }

  error(type: string, message: string, details?: Partial<LogDetails>) {
    return this.log("ERROR", { type, message, ...details });
  }

  authAttempt(details: {
    type: "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "REGISTER_ATTEMPT" | "REGISTER_SUCCESS" | "LOGOUT";
    email?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    status?: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const level = details.type.includes("FAILURE") ? "WARN" : "INFO";
    return this.log(level, {
      type: details.type,
      message: details.message,
      userEmail: details.email,
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      status: details.status || (details.type.includes("FAILURE") ? "FAILURE" : "SUCCESS"),
      metadata: details.metadata,
    });
  }

  mediaView(details: {
    fileName: string;
    filePath: string;
    mediaType: string;
    userEmail?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.log("INFO", {
      type: "MEDIA_VIEW",
      message: `Opened media preview: ${details.fileName}`,
      userEmail: details.userEmail,
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      status: "SUCCESS",
      metadata: {
        path: details.filePath,
        type: details.mediaType,
      },
    });
  }
}

export const logger = new ServerLogger();
