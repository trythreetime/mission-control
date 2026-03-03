import { redirect } from "next/navigation";

import { UserAuditTableClient } from "@/components/user-audit-table-client";
import { hasRoleAtLeast } from "@/lib/auth/roles";
import { requireAppSession } from "@/lib/auth/session";

export default async function UserAuditPage() {
  const session = await requireAppSession();
  if (!hasRoleAtLeast(session.role, "admin")) {
    redirect("/");
  }

  return <UserAuditTableClient />;
}
