import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { acknowledgeAlert } from "@/lib/services/alerts.service";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole("operator");
  if (session instanceof Response) {
    return session;
  }

  const { id } = await context.params;

  if (!id || id.trim().length === 0) {
    return apiError("INVALID_ALERT_ID", "Alert id is required.", { status: 400 });
  }

  try {
    await acknowledgeAlert(id, session.email);
    return apiSuccess({ id, status: "acknowledged" });
  } catch (error) {
    return apiError("ALERT_ACK_FAILED", "Failed to acknowledge alert.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
