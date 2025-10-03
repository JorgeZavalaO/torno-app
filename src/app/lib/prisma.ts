import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Optimizaciones de conexiones
    transactionOptions: {
      timeout: 10000, // 10 segundos
      maxWait: 5000, // 5 segundos máximo esperando una transacción
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
