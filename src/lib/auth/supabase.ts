import "server-only";

export type SupabaseAuthUser = {
  id: string;
  email: string | null;
};

export type SupabaseAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: SupabaseAuthUser;
};

type SupabaseErrorBody = {
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

export class SupabaseAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseAuthError";
    this.status = status;
  }
}

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Supabase auth env is not set. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    anonKey,
  };
}

function readSupabaseError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const payload = json as SupabaseErrorBody;
  return payload.error_description ?? payload.message ?? payload.msg ?? payload.error ?? null;
}

async function supabaseAuthFetch<T>(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<T> {
  const { supabaseUrl, anonKey } = getSupabaseEnv();

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    const message = readSupabaseError(payload) ?? `Supabase auth request failed with ${response.status}`;
    throw new SupabaseAuthError(message, response.status);
  }

  return payload as T;
}

function parseAuthSession(payload: SupabaseAuthSession): SupabaseAuthSession {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.access_token !== "string" ||
    typeof payload.refresh_token !== "string" ||
    typeof payload.expires_in !== "number" ||
    !payload.user ||
    typeof payload.user.id !== "string"
  ) {
    throw new Error("Invalid Supabase auth response.");
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    token_type: payload.token_type,
    user: {
      id: payload.user.id,
      email: typeof payload.user.email === "string" ? payload.user.email : null,
    },
  };
}

export async function signInWithPassword(email: string, password: string): Promise<SupabaseAuthSession> {
  const payload = await supabaseAuthFetch<SupabaseAuthSession>("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseAuthSession(payload);
}

export async function sendEmailOtp(email: string): Promise<void> {
  await supabaseAuthFetch<unknown>("/auth/v1/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: true,
    }),
  });
}

export async function verifyEmailOtp(email: string, token: string): Promise<SupabaseAuthSession> {
  const payload = await supabaseAuthFetch<SupabaseAuthSession>("/auth/v1/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      token,
      type: "email",
    }),
  });

  return parseAuthSession(payload);
}

export async function getSupabaseUserFromAccessToken(accessToken: string): Promise<SupabaseAuthUser | null> {
  try {
    const payload = await supabaseAuthFetch<SupabaseAuthUser>("/auth/v1/user", {
      method: "GET",
    }, accessToken);

    if (!payload || typeof payload.id !== "string") {
      return null;
    }

    return {
      id: payload.id,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch (error) {
    if (error instanceof SupabaseAuthError && error.status === 401) {
      return null;
    }

    throw error;
  }
}
