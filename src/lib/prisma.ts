import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildClient() {
  const base = process.env.DATABASE_URL ?? "";
  const sep = base.includes("?") ? "&" : "?";
  return new PrismaClient({
    datasources: {
      db: { url: `${base}${sep}connection_limit=3&pool_timeout=20` },
    },
  });
}

export const prisma = globalForPrisma.prisma || buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
