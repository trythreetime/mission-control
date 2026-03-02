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

type Props = {
  className?: string;
  initialHint?: string;
};

export function LoginForm({ className, initialHint }: Props) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(initialHint ?? null);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (mode === "password") return password.length >= 6;
    return otpSent ? otpToken.length >= 6 : true;
  }, [email, mode, otpSent, otpToken, password]);

  const handlePasswordLogin = async () => {
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as ApiResponse<{ sent: boolean }>;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
    }

    setOtpSent(true);
    setHint("验证码已发送，请查看邮箱");
  };

  const handleOtpVerify = async () => {
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    <section
      className={`w-full rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${className ?? ""}`}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in to Mission Control</h1>
      <p className="mt-2 text-sm text-slate-300">Secure access for operators and administrators.</p>

      <div className="mt-5 flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 transition ${
            mode === "password"
              ? "border border-white/20 bg-white/15 text-white"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
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
          className={`rounded-lg px-3 py-1.5 transition ${
            mode === "otp" ? "border border-white/20 bg-white/15 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
          onClick={() => {
            setMode("otp");
            setHint(null);
          }}
        >
          Email OTP
        </button>
      </div>

      <form className="mt-5 space-y-3.5" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">账号 / Email</span>
          <input
            type="text"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-2.5 text-slate-100 outline-none ring-white/30 transition focus:ring"
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
              className="w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-2.5 text-slate-100 outline-none ring-white/30 transition focus:ring"
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
              className="w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-2.5 text-slate-100 outline-none ring-white/30 transition focus:ring"
              placeholder="123456"
            />
          </label>
        ) : null}

        {hint ? <p className="text-xs text-cyan-200">{hint}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 font-medium text-white transition hover:bg-white/20 disabled:opacity-60"
        >
          {busy ? "Please wait..." : mode === "password" ? "Sign in" : otpSent ? "Verify OTP" : "Send OTP"}
        </button>
      </form>
    </section>
  );
}
