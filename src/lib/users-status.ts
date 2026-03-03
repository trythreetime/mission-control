import type { ProfileStatus } from "@prisma/client";

export const API_PROFILE_STATUSES = ["active", "disabled"] as const;

export type ApiProfileStatus = (typeof API_PROFILE_STATUSES)[number];

export function toDbProfileStatus(status: ApiProfileStatus): ProfileStatus {
  return status === "disabled" ? "inactive" : "active";
}

export function toApiProfileStatus(status: ProfileStatus): ApiProfileStatus {
  return status === "inactive" ? "disabled" : "active";
}
