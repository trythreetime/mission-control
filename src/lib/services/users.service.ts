import "server-only";

import type { Prisma, ProfileStatus, UserRole } from "@prisma/client";

import { db } from "@/lib/db";

export type UserListFilters = {
  query?: string;
  role?: UserRole;
  status?: ProfileStatus;
  page: number;
  pageSize: number;
};

export type UserListItem = {
  userId: string;
  email: string;
  role: UserRole;
  status: ProfileStatus;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UsersListResult = {
  users: UserListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    query: string;
    role: UserRole | null;
    status: ProfileStatus | null;
  };
};

export type AuditActor = {
  userId: string;
  email: string;
};

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

function toUserListItem(profile: {
  userId: string;
  email: string;
  role: UserRole;
  status: ProfileStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}): UserListItem {
  return {
    userId: profile.userId,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    lastLoginAt: profile.lastLoginAt ? profile.lastLoginAt.toISOString() : null,
    createdAt: profile.createdAt.toISOString(),
  };
}

export async function listUsers(filters: UserListFilters): Promise<UsersListResult> {
  const where: Prisma.ProfileWhereInput = {
    ...(filters.query
      ? {
          email: {
            contains: filters.query,
            mode: "insensitive",
          },
        }
      : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const skip = (filters.page - 1) * filters.pageSize;

  const total = await db.profile.count({ where });
  const profiles = await db.profile.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
    skip,
    take: filters.pageSize,
    select: {
      userId: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return {
    users: profiles.map((profile) => toUserListItem(profile)),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
    filters: {
      query: filters.query ?? "",
      role: filters.role ?? null,
      status: filters.status ?? null,
    },
  };
}

export async function updateUserRole(
  targetUserId: string,
  role: UserRole,
  actor: AuditActor,
): Promise<UserListItem> {
  return db.$transaction(async (tx) => {
    const current = await tx.profile.findUnique({
      where: { userId: targetUserId },
      select: {
        userId: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!current) {
      throw new UserNotFoundError(targetUserId);
    }

    if (current.role === role) {
      return toUserListItem(current);
    }

    const updated = await tx.profile.update({
      where: { userId: targetUserId },
      data: { role },
      select: {
        userId: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    await tx.userAuditLog.create({
      data: {
        targetUserId: updated.userId,
        targetEmail: updated.email,
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "role_changed",
        roleBefore: current.role,
        roleAfter: updated.role,
      },
    });

    return toUserListItem(updated);
  });
}
