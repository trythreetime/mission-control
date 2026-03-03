import { UserRole } from "@prisma/client";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { updateUserRole, UserNotFoundError } from "@/lib/services/users.service";

const bodySchema = z.object({
  role: z.nativeEnum(UserRole),
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
    return apiError("INVALID_ROLE_PAYLOAD", "Invalid role payload.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const user = await updateUserRole(targetUserId, parsed.data.role, {
      userId: session.userId,
      email: session.email,
    });

    return apiSuccess({ user });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return apiError("USER_NOT_FOUND", "User not found.", { status: 404 });
    }

    return apiError("USER_ROLE_UPDATE_FAILED", "Failed to update user role.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
