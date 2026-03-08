"use client";

import { Bot, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PageAgentModule = typeof import("page-agent");
type PageAgentInstance = InstanceType<PageAgentModule["PageAgent"]>;
type AgentStatus = "idle" | "running" | "completed" | "error";

const PAGE_AGENT_MODEL = process.env.NEXT_PUBLIC_PAGE_AGENT_MODEL ?? "qwen3.5-plus";
const PAGE_AGENT_LANGUAGE = process.env.NEXT_PUBLIC_PAGE_AGENT_LANGUAGE ?? "zh-CN";
const PAGE_AGENT_PROXY_BASE_URL = "/api/page-agent";
const PAGE_AGENT_PROXY_TOKEN = "server-proxy";

const statusLabelMap: Record<AgentStatus, string> = {
  idle: "已就绪，可直接输入页面指令",
  running: "执行中，面板会同步展示进度",
  completed: "上次任务已完成，可继续发新指令",
  error: "上次任务失败，可重新尝试",
};

const defaultStatus = "点击打开 Page Agent";

export function PageAgentEntry() {
  const agentRef = useRef<PageAgentInstance | null>(null);
  const creatingAgentRef = useRef<Promise<PageAgentInstance> | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState(defaultStatus);

  const proxyFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const headers = new Headers(init?.headers);

    headers.delete("authorization");

    return fetch(url, {
      method: init?.method,
      headers,
      body: init?.body,
      signal: init?.signal,
      credentials: "same-origin",
    });
  };

  useEffect(() => {
    return () => {
      creatingAgentRef.current = null;
      agentRef.current?.dispose();
      agentRef.current = null;
    };
  }, []);

  const ensureAgent = async () => {
    if (agentRef.current && !agentRef.current.disposed) {
      return agentRef.current;
    }

    if (creatingAgentRef.current) {
      return creatingAgentRef.current;
    }

    const creatingAgent = (async () => {
      const { PageAgent } = await import("page-agent");
      const agent = new PageAgent({
        model: PAGE_AGENT_MODEL,
        baseURL: PAGE_AGENT_PROXY_BASE_URL,
        apiKey: PAGE_AGENT_PROXY_TOKEN,
        language: PAGE_AGENT_LANGUAGE === "en-US" ? "en-US" : "zh-CN",
        customFetch: proxyFetch,
      });

      agent.addEventListener("statuschange", () => {
        setStatusText(statusLabelMap[agent.status] ?? defaultStatus);
      });

      agent.addEventListener("dispose", () => {
        if (agentRef.current === agent) {
          agentRef.current = null;
        }
        creatingAgentRef.current = null;
        setStatusText(defaultStatus);
      });

      agentRef.current = agent;
      setStatusText(statusLabelMap[agent.status] ?? defaultStatus);
      return agent;
    })();

    creatingAgentRef.current = creatingAgent;

    try {
      return await creatingAgent;
    } catch (error) {
      creatingAgentRef.current = null;
      throw error;
    }
  };

  const openAgentPanel = async () => {
    setBusy(true);
    setStatusText("正在初始化 Page Agent...");

    try {
      const agent = await ensureAgent();
      agent.panel.show();
      setStatusText(statusLabelMap[agent.status] ?? defaultStatus);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Page Agent 初始化失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70]">
      <section className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-cyan-300/20 bg-slate-950/80 p-3.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-2 text-cyan-200">
            <Bot className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">Page Agent 测试入口</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{statusText}</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              当前默认模型为 {PAGE_AGENT_MODEL}，通过站内代理发起请求，API Key 仅保留在服务端。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAgentPanel}
          disabled={busy}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-400/12 px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/18 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          {busy ? "正在打开..." : "打开 Page Agent"}
        </button>
      </section>
    </div>
  );
}
