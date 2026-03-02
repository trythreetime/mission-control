import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { setAuthCookies } from "@/lib/auth/cookies";
import { SupabaseAuthError, signInWithPassword } from "@/lib/auth/supabase";
import { ensureProfileForUser } from "@/lib/services/profiles.service";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
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
    return apiError("INVALID_AUTH_PAYLOAD", "Invalid login payload.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const session = await signInWithPassword(parsed.data.email, parsed.data.password);
    const profile = await ensureProfileForUser(session.user.id, session.user.email ?? parsed.data.email);

    const response = apiSuccess({
      user: {
        id: profile.userId,
        email: profile.email,
        role: profile.role,
      },
    });
    setAuthCookies(response, session);

    return response;
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      return apiError("AUTH_FAILED", error.message, { status: error.status });
    }

    return apiError("AUTH_FAILED", "Failed to sign in.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
