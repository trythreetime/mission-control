import "server-only";

import { Prisma, UserRole } from "@prisma/client";

import { db } from "@/lib/db";

export type UserProfile = {
  userId: string;
  email: string;
  role: UserRole;
};

const SERIALIZABLE_RETRIES = 3;

export async function ensureProfileForUser(userId: string, email: string): Promise<UserProfile> {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      const profile = await db.$transaction(
        async (tx) => {
          const existing = await tx.profile.findUnique({
            where: { userId },
            select: {
              userId: true,
              email: true,
              role: true,
            },
          });

          if (existing) {
            if (existing.email !== email) {
              const updated = await tx.profile.update({
                where: { userId },
                data: { email },
                select: {
                  userId: true,
                  email: true,
                  role: true,
                },
              });
              return updated;
            }

            return existing;
          }

          const profileCount = await tx.profile.count();
          const role: UserRole = profileCount === 0 ? "admin" : "viewer";

          return tx.profile.create({
            data: {
              userId,
              email,
              role,
            },
            select: {
              userId: true,
              email: true,
              role: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return profile;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < SERIALIZABLE_RETRIES - 1
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create profile after retries.");
}

export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  return db.profile.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      role: true,
    },
  });
}

export async function markProfileLogin(userId: string): Promise<void> {
  await db.profile.update({
    where: { userId },
    data: {
      status: "active",
      lastLoginAt: new Date(),
    },
  });
}
