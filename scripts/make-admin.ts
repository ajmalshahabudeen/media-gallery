import { prisma } from "@/lib/prisma";

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log("\x1b[31m[ERROR]\x1b[0m Please provide a user email address.");
    console.log("\x1b[36mUsage:\x1b[0m bun run scripts/make-admin.ts <user-email>");
    console.log("\x1b[36mDocker:\x1b[0m docker exec -it media_gallery_app bun run scripts/make-admin.ts <user-email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`\x1b[31m[ERROR]\x1b[0m User with email '\x1b[33m${email}\x1b[0m' was not found in the database.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });

  console.log(`\x1b[32m[SUCCESS]\x1b[0m Granted administrator role to \x1b[1m${user.name}\x1b[0m (\x1b[36m${email}\x1b[0m).`);
  process.exit(0);
}

makeAdmin().catch((err) => {
  console.error("\x1b[31m[ERROR]\x1b[0m Failed to update user role:", err);
  process.exit(1);
});
