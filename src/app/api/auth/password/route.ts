import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setAuthCookies } from "@/lib/auth/cookies";
import { SupabaseAuthError, signInWithPassword } from "@/lib/auth/supabase";
import { ensureProfileForUser } from "@/lib/services/profiles.service";

const LOCAL_ADMIN_USERNAME = process.env.LOCAL_ADMIN_USERNAME ?? "admin";
const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD ?? "123456";
const LOCAL_ADMIN_TOKEN = "mc-local-admin";

const schema = z.object({
  email: z.string().trim().min(1),
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
    if (
      parsed.data.email === LOCAL_ADMIN_USERNAME &&
      parsed.data.password === LOCAL_ADMIN_PASSWORD
    ) {
      const response = apiSuccess({
        user: {
          id: "local-admin",
          email: "admin@local",
          role: "admin",
        },
      });

      response.cookies.set({
        name: ACCESS_TOKEN_COOKIE,
        value: LOCAL_ADMIN_TOKEN,
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      response.cookies.set({
        name: REFRESH_TOKEN_COOKIE,
        value: LOCAL_ADMIN_TOKEN,
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      return response;
    }

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
