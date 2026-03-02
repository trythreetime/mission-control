import type { NextResponse } from "next/server";

import type { SupabaseAuthSession } from "@/lib/auth/supabase";

export const ACCESS_TOKEN_COOKIE = "mc-access-token";
export const REFRESH_TOKEN_COOKIE = "mc-refresh-token";

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setAuthCookies(response: NextResponse, session: SupabaseAuthSession) {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: session.access_token,
    maxAge: session.expires_in,
    ...BASE_COOKIE_OPTIONS,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: session.refresh_token,
    maxAge: 60 * 60 * 24 * 30,
    ...BASE_COOKIE_OPTIONS,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    maxAge: 0,
    ...BASE_COOKIE_OPTIONS,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    maxAge: 0,
    ...BASE_COOKIE_OPTIONS,
  });
}
