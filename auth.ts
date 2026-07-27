import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { admin } from "better-auth/plugins";
import { logger } from "@/lib/logger";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:38479",
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await logger.authAttempt({
            type: "REGISTER_SUCCESS",
            email: user.email,
            userId: user.id,
            message: `New user registered: ${user.email} (${user.name})`,
          });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await logger.authAttempt({
            type: "LOGIN_SUCCESS",
            userId: session.userId,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            message: `User logged in successfully`,
          });
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:38479",
    "http://localhost:3000",
    "http://127.0.0.1:38479",
    "http://127.0.0.1:3000",
    "http://192.168.*.*:38479",
    "http://192.168.*.*:3000",
    "http://10.*.*.*:38479",
    "http://10.*.*.*:3000",
    "http://172.16.*.*:38479",
    "http://172.16.*.*:3000",
    "http://*.local:38479",
    "http://*.local:3000",
    "http://*:38479",
    "http://*:3000",
    "http://*",
    "https://*",
  ],
  plugins: [admin()],
});
