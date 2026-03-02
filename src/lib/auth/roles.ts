import type { UserRole } from "@prisma/client";

const roleRank: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

export function hasRoleAtLeast(current: UserRole, required: UserRole): boolean {
  return roleRank[current] >= roleRank[required];
}
