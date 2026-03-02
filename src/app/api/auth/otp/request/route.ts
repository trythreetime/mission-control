import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { SupabaseAuthError, sendEmailOtp } from "@/lib/auth/supabase";

const schema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_AUTH_PAYLOAD", "Invalid OTP request payload.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    await sendEmailOtp(parsed.data.email);
    return apiSuccess({ sent: true });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      return apiError("OTP_REQUEST_FAILED", error.message, { status: error.status });
    }

    return apiError("OTP_REQUEST_FAILED", "Failed to send OTP.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
