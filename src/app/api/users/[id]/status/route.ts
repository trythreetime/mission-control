import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { updateUserStatus, UserNotFoundError } from "@/lib/services/users.service";
import { API_PROFILE_STATUSES, toApiProfileStatus, toDbProfileStatus } from "@/lib/users-status";

const bodySchema = z.object({
  status: z.enum(API_PROFILE_STATUSES),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("admin");
  if (session instanceof Response) {
    return session;
  }

  const { id } = await context.params;
  const targetUserId = id.trim();
  if (!targetUserId) {
    return apiError("INVALID_USER_ID", "User id is required.", { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_STATUS_PAYLOAD", "Invalid status payload.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  if (session.userId === targetUserId && parsed.data.status === "disabled") {
    return apiError("CANNOT_DISABLE_SELF", "You cannot disable your currently logged-in account.", {
      status: 400,
    });
  }

  try {
    const user = await updateUserStatus(targetUserId, toDbProfileStatus(parsed.data.status), {
      userId: session.userId,
      email: session.email,
    });

    return apiSuccess({
      user: {
        ...user,
        status: toApiProfileStatus(user.status),
      },
    });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return apiError("USER_NOT_FOUND", "User not found.", { status: 404 });
    }

    return apiError("USER_STATUS_UPDATE_FAILED", "Failed to update user status.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
