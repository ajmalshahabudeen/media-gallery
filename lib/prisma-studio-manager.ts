import { spawn, type ChildProcess, exec } from "node:child_process";
import http from "node:http";

interface PrismaStudioState {
  process: ChildProcess | null;
  status: "stopped" | "starting" | "running" | "error";
  port: number;
  startedAt: number | null;
  error: string | null;
  pid: number | null;
}

declare global {
  var __prismaStudioState: PrismaStudioState | undefined;
}

const DEFAULT_PORT = 5555;

function getState(): PrismaStudioState {
  if (!globalThis.__prismaStudioState) {
    globalThis.__prismaStudioState = {
      process: null,
      status: "stopped",
      port: DEFAULT_PORT,
      startedAt: null,
      error: null,
      pid: null,
    };
  }
  return globalThis.__prismaStudioState;
}

/**
 * Check if Prisma Studio is actively responding on the given port
 */
export async function isPortResponding(
  port: number = DEFAULT_PORT,
  timeoutMs: number = 800
): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/",
        timeout: timeoutMs,
      },
      (res) => {
        // Prisma Studio returns 200 with HTML
        resolve(res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 302);
        res.resume();
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Get current Studio running status
 */
export async function getStudioStatus(): Promise<{
  running: boolean;
  status: "stopped" | "starting" | "running" | "error";
  port: number;
  pid: number | null;
  startedAt: number | null;
  error: string | null;
}> {
  const state = getState();
  const responding = await isPortResponding(state.port);

  if (responding) {
    state.status = "running";
    if (!state.startedAt) {
      state.startedAt = Date.now();
    }
  } else if (state.status === "running") {
    state.status = "stopped";
    state.process = null;
    state.pid = null;
    state.startedAt = null;
  }

  return {
    running: state.status === "running" || responding,
    status: responding ? "running" : state.status,
    port: state.port,
    pid: state.pid,
    startedAt: state.startedAt,
    error: state.error,
  };
}

/**
 * Start Prisma Studio process
 */
export async function startStudio(
  port: number = DEFAULT_PORT
): Promise<{
  success: boolean;
  running: boolean;
  port: number;
  message?: string;
  error?: string;
}> {
  const state = getState();
  state.port = port;

  // 1. If already responding, return immediately
  const alreadyResponding = await isPortResponding(port);
  if (alreadyResponding) {
    state.status = "running";
    return {
      success: true,
      running: true,
      port,
      message: "Prisma Studio is already running",
    };
  }

  // 2. Mark state as starting
  state.status = "starting";
  state.error = null;

  try {
    const isWindows = process.platform === "win32";
    const env = {
      ...process.env,
      HOST: "0.0.0.0",
      HOSTNAME: "0.0.0.0",
    };

    // Default method: bun prisma studio --browser none --port <port>
    const child = spawn(
      "bun",
      ["prisma", "studio", "--browser", "none", "--port", String(port)],
      {
        cwd: process.cwd(),
        env,
        shell: isWindows,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    state.process = child;
    state.pid = child.pid ?? null;
    state.startedAt = Date.now();

    let stderrOutput = "";
    child.stderr?.on("data", (data) => {
      const chunk = data.toString();
      stderrOutput += chunk;
      console.error("[Prisma Studio Error]:", chunk);
    });

    child.stdout?.on("data", (data) => {
      const chunk = data.toString();
      console.log("[Prisma Studio]:", chunk);
    });

    child.on("error", (err) => {
      console.error("[Prisma Studio Spawn Error]:", err);
      state.status = "error";
      state.error = err.message;
      state.process = null;
      state.pid = null;
    });

    child.on("exit", (code, signal) => {
      console.log(`[Prisma Studio Exited]: code=${code}, signal=${signal}`);
      if (state.status === "starting" || state.status === "running") {
        state.status = "stopped";
        if (code !== 0 && code !== null && !state.error) {
          state.error = stderrOutput || `Process exited with code ${code}`;
        }
      }
      state.process = null;
      state.pid = null;
      state.startedAt = null;
    });

    // 3. Poll for port readiness (up to 7 seconds)
    const startTime = Date.now();
    while (Date.now() - startTime < 7000) {
      const currentState = getState();
      if (currentState.error || (currentState.status as string) === "error") {
        return {
          success: false,
          running: false,
          port,
          error: currentState.error || "Failed to start Prisma Studio process",
        };
      }

      const ready = await isPortResponding(port);
      if (ready) {
        state.status = "running";
        return {
          success: true,
          running: true,
          port,
          message: `Prisma Studio started successfully on port ${port}`,
        };
      }

      await new Promise((r) => setTimeout(r, 250));
    }

    // Check if ready after timeout
    const finalCheck = await isPortResponding(port);
    if (finalCheck) {
      state.status = "running";
      return {
        success: true,
        running: true,
        port,
      };
    }

    state.status = "error";
    state.error = stderrOutput || "Prisma Studio startup timed out after 7 seconds";
    return {
      success: false,
      running: false,
      port,
      error: state.error,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to spawn Prisma Studio";
    state.status = "error";
    state.error = message;
    return {
      success: false,
      running: false,
      port,
      error: message,
    };
  }
}

/**
 * Stop Prisma Studio process
 */
export async function stopStudio(
  port: number = DEFAULT_PORT
): Promise<{
  success: boolean;
  running: boolean;
  port: number;
  message?: string;
}> {
  const state = getState();
  const pid = state.pid;

  if (state.process && !state.process.killed) {
    try {
      if (process.platform === "win32" && pid) {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) {
            try {
              state.process?.kill("SIGTERM");
            } catch {
              // ignore
            }
          }
        });
      } else {
        state.process.kill("SIGTERM");
        setTimeout(() => {
          if (state.process && !state.process.killed) {
            try {
              state.process.kill("SIGKILL");
            } catch {
              // ignore
            }
          }
        }, 1000);
      }
    } catch (err) {
      console.error("[Prisma Studio Kill Error]:", err);
    }
  }

  // Wait until port stops responding (up to 3 seconds)
  const startTime = Date.now();
  while (Date.now() - startTime < 3000) {
    const responding = await isPortResponding(port, 300);
    if (!responding) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  state.status = "stopped";
  state.process = null;
  state.pid = null;
  state.startedAt = null;
  state.error = null;

  return {
    success: true,
    running: false,
    port,
    message: "Prisma Studio stopped",
  };
}
