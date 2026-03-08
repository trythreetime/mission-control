"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob } from "@/lib/services/types";

type JobCreateApiData = {
  job: DashboardJob;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (job: DashboardJob) => void;
};

type TemplateValue = "custom" | "sync-telemetry" | "nightly-backup" | "edge-deploy" | "db-maintenance" | "log-compaction";
type PriorityValue = "low" | "normal" | "high" | "critical";
type RegionValue = "auto" | "us-east" | "us-west" | "eu-west" | "global";
type ExecutionModeValue = "standard" | "rolling" | "canary" | "batch";

const nativeSelectClassName =
  "h-10 w-full rounded-xl border border-white/15 bg-black/20 px-3.5 text-slate-100 outline-none ring-white/30 transition focus:ring";

const JOB_TEMPLATE_PRESETS: Record<
  Exclude<TemplateValue, "custom">,
  {
    label: string;
    name: string;
    type: string;
    owner: string;
    payload: Record<string, unknown>;
  }
> = {
  "sync-telemetry": {
    label: "Sync telemetry",
    name: "Sync telemetry",
    type: "telemetry",
    owner: "system",
    payload: { stream: "telemetry", window: "5m" },
  },
  "nightly-backup": {
    label: "Nightly backup",
    name: "Nightly backup",
    type: "backup",
    owner: "ops",
    payload: { retentionDays: 14, verifyChecksum: true },
  },
  "edge-deploy": {
    label: "Deploy edge config",
    name: "Deploy edge config",
    type: "deploy",
    owner: "devops",
    payload: { strategy: "rolling", artifact: "edge-config" },
  },
  "db-maintenance": {
    label: "Database maintenance",
    name: "Database maintenance",
    type: "maintenance",
    owner: "dbops",
    payload: { vacuum: true, analyze: true },
  },
  "log-compaction": {
    label: "Log compaction",
    name: "Log compaction",
    type: "compaction",
    owner: "platform",
    payload: { source: "logs", compress: true },
  },
};

const PRIORITY_OPTIONS: Array<{ value: PriorityValue; label: string }> = [
  { value: "low", label: "low · 低优先级" },
  { value: "normal", label: "normal · 默认" },
  { value: "high", label: "high · 优先处理" },
  { value: "critical", label: "critical · 立即处理" },
];

const REGION_OPTIONS: Array<{ value: RegionValue; label: string }> = [
  { value: "auto", label: "Auto detect" },
  { value: "us-east", label: "us-east" },
  { value: "us-west", label: "us-west" },
  { value: "eu-west", label: "eu-west" },
  { value: "global", label: "global" },
];

const EXECUTION_MODE_OPTIONS: Array<{ value: ExecutionModeValue; label: string }> = [
  { value: "standard", label: "standard" },
  { value: "rolling", label: "rolling" },
  { value: "canary", label: "canary" },
  { value: "batch", label: "batch window" },
];

const initialFormState = {
  template: "custom" as TemplateValue,
  name: "",
  type: "",
  owner: "",
  priority: "normal" as PriorityValue,
  region: "auto" as RegionValue,
  executionMode: "standard" as ExecutionModeValue,
  payloadText: "",
};

function buildMergedPayloadText(formState: typeof initialFormState) {
  const metadata: Record<string, unknown> = {};

  if (formState.template !== "custom") {
    metadata.template = formState.template;
  }

  if (formState.region !== "auto") {
    metadata.targetRegion = formState.region;
  }

  if (formState.executionMode !== "standard") {
    metadata.executionMode = formState.executionMode;
  }

  if (!formState.payloadText.trim()) {
    return Object.keys(metadata).length > 0 ? JSON.stringify(metadata, null, 2) : "";
  }

  const parsed = JSON.parse(formState.payloadText) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Payload JSON 必须是一个对象。");
  }

  const mergedPayload = {
    ...(parsed as Record<string, unknown>),
    ...metadata,
  };

  return JSON.stringify(mergedPayload, null, 2);
}

export function JobCreateDialog({ open, onClose, onCreated }: Props) {
  const [formState, setFormState] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open, submitting]);

  useEffect(() => {
    if (!open) {
      setFormState(initialFormState);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payloadText = buildMergedPayloadText(formState);
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          type: formState.type,
          owner: formState.owner,
          priority: formState.priority,
          payloadText,
        }),
      });

      const payload = (await response.json()) as ApiResponse<JobCreateApiData>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
      }

      onCreated(payload.data.job);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close create job dialog"
        onClick={closeDialog}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-[91] w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Create Job</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">新增任务</h2>
            <p className="mt-2 text-sm text-slate-400">填写基础参数后，任务会以 queued 状态进入队列。</p>
          </div>

          <button
            type="button"
            onClick={closeDialog}
            disabled={submitting}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
          >
            关闭
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">任务模板</span>
              <select
                value={formState.template}
                onChange={(event) => {
                  const value = event.target.value as TemplateValue;

                  if (value === "custom") {
                    setFormState((current) => ({ ...current, template: value }));
                    return;
                  }

                  const preset = JOB_TEMPLATE_PRESETS[value];
                  setFormState((current) => ({
                    ...current,
                    template: value,
                    name: preset.name,
                    type: preset.type,
                    owner: preset.owner,
                    payloadText:
                      current.payloadText.trim().length > 0 ? current.payloadText : JSON.stringify(preset.payload, null, 2),
                  }));
                }}
                className={nativeSelectClassName}
              >
                <option value="custom">custom · 手动填写</option>
                {Object.entries(JOB_TEMPLATE_PRESETS).map(([value, preset]) => (
                  <option key={value} value={value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">选择模板后，会自动填充常用字段和值。</p>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">优先级</span>
              <select
                value={formState.priority}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, priority: event.target.value as PriorityValue }))
                }
                className={nativeSelectClassName}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">任务名称</span>
              <Input
                required
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：Sync telemetry"
                className="border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">任务类型</span>
              <Input
                required
                value={formState.type}
                onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value }))}
                placeholder="例如：deploy / backup / telemetry"
                className="border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">Owner</span>
              <Input
                required
                value={formState.owner}
                onChange={(event) => setFormState((current) => ({ ...current, owner: event.target.value }))}
                placeholder="例如：ops / devops / system"
                className="border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-500"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">目标区域</span>
              <select
                value={formState.region}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, region: event.target.value as RegionValue }))
                }
                className={nativeSelectClassName}
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">执行模式</span>
              <select
                value={formState.executionMode}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    executionMode: event.target.value as ExecutionModeValue,
                  }))
                }
                className={nativeSelectClassName}
              >
                {EXECUTION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Payload JSON</span>
            <textarea
              value={formState.payloadText}
              onChange={(event) => setFormState((current) => ({ ...current, payloadText: event.target.value }))}
              placeholder='{"region":"us-east","retry":3}'
              className="min-h-32 w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-3 text-slate-100 outline-none ring-white/30 transition focus:ring"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              可选，若填写则必须是合法 JSON 对象；模板、区域和执行模式会自动合并进这个 payload。
            </p>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={submitting}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/25 disabled:opacity-60"
            >
              {submitting ? "创建中..." : "创建任务"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
