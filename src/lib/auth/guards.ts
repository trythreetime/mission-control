import type { UserRole } from "@prisma/client";

import { apiError } from "@/lib/api-response";
import { hasRoleAtLeast } from "@/lib/auth/roles";
import { getOptionalAppSession, type AppSession } from "@/lib/auth/session";

export async function requireApiRole(requiredRole: UserRole): Promise<AppSession | Response> {
  const session = await getOptionalAppSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Authentication required.", {
      status: 401,
    });
  }

  if (!hasRoleAtLeast(session.role, requiredRole)) {
    return apiError("FORBIDDEN", "Insufficient permissions.", {
      status: 403,
      details: {
        requiredRole,
        currentRole: session.role,
      },
    });
  }

  return session;
}
