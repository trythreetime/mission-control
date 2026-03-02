import { apiError, apiSuccess } from "@/lib/api-response";
import { getOptionalAppSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getOptionalAppSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Authentication required.", { status: 401 });
    }

    return apiSuccess({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
      },
    });
  } catch (error) {
    return apiError("SESSION_FETCH_FAILED", "Failed to fetch session.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
