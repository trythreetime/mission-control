import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getOptionalAppSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getOptionalAppSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen p-6">
      <LoginForm />
    </main>
  );
}
