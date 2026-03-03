"use client";

import type { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ApiResponse } from "@/lib/api-response";

type Props = {
  userId: string;
  email: string;
  currentRole: UserRole;
  onUpdated?: (nextRole: UserRole) => void;
};

type UpdateRoleApiData = {
  user: {
    userId: string;
    role: UserRole;
  };
};

const roleOptions: UserRole[] = ["viewer", "operator", "admin"];

export function UserRoleEditor({ userId, email, currentRole, onUpdated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = useMemo(() => selectedRole !== currentRole, [selectedRole, currentRole]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setOpen(false);
        setError(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving]);

  async function onSave() {
    if (!hasChanges || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/role`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const payload = (await response.json()) as ApiResponse<UpdateRoleApiData>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Failed to update role." : payload.error.message);
      }

      setOpen(false);
      if (onUpdated) {
        onUpdated(payload.data.user.role);
      } else {
        router.refresh();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedRole(currentRole);
          setError(null);
          setOpen(true);
        }}
        className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
      >
        Change role
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
            <h3 className="text-base font-semibold text-white">Update User Role</h3>
            <p className="mt-2 text-sm text-slate-300">{email}</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Role
              <select
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as UserRole)}
                disabled={saving}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (saving) {
                    return;
                  }
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className="rounded-md border border-cyan-300/30 bg-cyan-400/15 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-400/25 disabled:opacity-60"
                disabled={!hasChanges || saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
