import { redirect } from "next/navigation";

import { UsersTableClient } from "@/components/users-table-client";
import { hasRoleAtLeast } from "@/lib/auth/roles";
import { requireAppSession } from "@/lib/auth/session";

export default async function UsersPage() {
  const session = await requireAppSession();
  if (!hasRoleAtLeast(session.role, "admin")) {
    redirect("/");
  }

  return <UsersTableClient />;
}
