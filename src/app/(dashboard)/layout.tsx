import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireAppSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAppSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userEmail={session.email} role={session.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
