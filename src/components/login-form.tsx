"use client";

import { useMemo, useState } from "react";

import type { ApiResponse } from "@/lib/api-response";

type AuthUser = {
  id: string;
  email: string;
  role: string;
};

type AuthResponse = {
  user: AuthUser;
};

type Mode = "password" | "otp";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (mode === "password") return password.length >= 6;
    return otpSent ? otpToken.length >= 6 : true;
  }, [email, mode, otpSent, otpToken, password]);

  const handlePasswordLogin = async () => {
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json()) as ApiResponse<AuthResponse>;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
    }
  };

  const handleOtpRequest = async () => {
    const response = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as ApiResponse<{ sent: boolean }>;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
    }

    setOtpSent(true);
    setHint("OTP sent. Check your email and enter the code.");
  };

  const handleOtpVerify = async () => {
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, token: otpToken }),
    });

    const payload = (await response.json()) as ApiResponse<AuthResponse>;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setHint(null);

    try {
      if (mode === "password") {
        await handlePasswordLogin();
      } else if (!otpSent) {
        await handleOtpRequest();
        return;
      } else {
        await handleOtpVerify();
      }

      window.location.href = "/";
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto mt-16 w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-xl font-semibold">Sign in to Mission Control</h1>
      <p className="mt-2 text-sm text-slate-400">Use email/password or email OTP.</p>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded px-3 py-1 ${
            mode === "password" ? "bg-cyan-400/20 text-cyan-100" : "bg-white/5 text-slate-300"
          }`}
          onClick={() => {
            setMode("password");
            setHint(null);
          }}
        >
          Password
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1 ${mode === "otp" ? "bg-cyan-400/20 text-cyan-100" : "bg-white/5 text-slate-300"}`}
          onClick={() => {
            setMode("otp");
            setHint(null);
          }}
        >
          Email OTP
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">账号 / Email</span>
          <input
            type="text"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-white/20 bg-black/20 px-3 py-2 text-slate-100 outline-none ring-cyan-300/60 transition focus:ring"
            placeholder="admin 或 you@example.com"
          />
        </label>

        {mode === "password" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-white/20 bg-black/20 px-3 py-2 text-slate-100 outline-none ring-cyan-300/60 transition focus:ring"
              placeholder="••••••••"
            />
          </label>
        ) : null}

        {mode === "otp" && otpSent ? (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">OTP code</span>
            <input
              type="text"
              required
              value={otpToken}
              onChange={(event) => setOtpToken(event.target.value)}
              className="w-full rounded border border-white/20 bg-black/20 px-3 py-2 text-slate-100 outline-none ring-cyan-300/60 transition focus:ring"
              placeholder="123456"
            />
          </label>
        ) : null}

        {hint ? <p className="text-xs text-cyan-300">{hint}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="w-full rounded bg-cyan-400/20 px-3 py-2 font-medium text-cyan-100 transition hover:bg-cyan-400/30 disabled:opacity-60"
        >
          {busy
            ? "Please wait..."
            : mode === "password"
              ? "Sign in"
              : otpSent
                ? "Verify OTP"
                : "Send OTP"}
        </button>
      </form>
    </section>
  );
}
