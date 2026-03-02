import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getOptionalAppSession } from "@/lib/auth/session";

const reasonHintMap: Record<string, string> = {
  auth_required: "请先登录后再访问控制台。",
  session_expired: "会话已过期，请重新登录。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getOptionalAppSession();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  const initialHint = reason ? reasonHintMap[reason] : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_500px_at_12%_10%,rgba(255,255,255,0.12),transparent_60%),radial-gradient(800px_420px_at_88%_0%,rgba(111,132,165,0.20),transparent_65%)]" />

      <div className="relative mx-auto grid min-h-[86vh] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6 text-white">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs tracking-[0.18em] text-slate-200">
            CONTROL CENTER
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-white xl:text-6xl">
            Unified Mission Console
            <span className="block text-slate-300">for realtime operations</span>
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Monitor nodes, orchestrate jobs, and respond to alerts from a single secure interface.
          </p>

          <div className="grid max-w-xl grid-cols-3 gap-3 pt-2 text-sm">
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-2xl font-semibold">99.98%</p>
              <p className="text-slate-400">Uptime</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-2xl font-semibold">12</p>
              <p className="text-slate-400">Active Nodes</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-2xl font-semibold">24/7</p>
              <p className="text-slate-400">Coverage</p>
            </div>
          </div>
        </section>

        <div className="justify-self-end w-full max-w-md">
          <LoginForm initialHint={initialHint} />
        </div>
      </div>
    </main>
  );
}
