import "server-only";

import { Prisma, UserRole } from "@prisma/client";

import { db } from "@/lib/db";

export type UserProfile = {
  userId: string;
  email: string;
  role: UserRole;
};

export async function ensureProfileForUser(userId: string, email: string): Promise<UserProfile> {
  const existing = await db.profile.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      role: true,
    },
  });

  if (existing) {
    if (existing.email !== email) {
      return db.profile.update({
        where: { userId },
        data: { email },
        select: {
          userId: true,
          email: true,
          role: true,
        },
      });
    }

    return existing;
  }

  const profileCount = await db.profile.count();
  const role: UserRole = profileCount === 0 ? "admin" : "viewer";

  try {
    return await db.profile.create({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const created = await db.profile.findUnique({
        where: { userId },
        select: {
          userId: true,
          email: true,
          role: true,
        },
      });

      if (created) {
        return created;
      }
    }

    throw error;
  }
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
