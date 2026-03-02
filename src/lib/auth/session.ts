import "server-only";

import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { getSupabaseUserFromAccessToken } from "@/lib/auth/supabase";
import { ensureProfileForUser } from "@/lib/services/profiles.service";

const LOCAL_ADMIN_TOKEN = "mc-local-admin";
const LOCAL_ADMIN_EMAIL = "admin@local";

export type AppSession = {
  userId: string;
  email: string;
  role: UserRole;
};

export async function getOptionalAppSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  if (accessToken === LOCAL_ADMIN_TOKEN) {
    return {
      userId: "local-admin",
      email: LOCAL_ADMIN_EMAIL,
      role: "admin",
    };
  }

  const user = await getSupabaseUserFromAccessToken(accessToken);
  if (!user?.id) {
    return null;
  }

  const email = user.email ?? "unknown@example.com";
  const profile = await ensureProfileForUser(user.id, email);

  return {
    userId: profile.userId,
    email: profile.email,
    role: profile.role,
  };
}

export async function requireAppSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  const hasAccessToken = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);

  const session = await getOptionalAppSession();
  if (!session) {
    redirect(hasAccessToken ? "/login?reason=session_expired" : "/login?reason=auth_required");
  }

  return session;
}
