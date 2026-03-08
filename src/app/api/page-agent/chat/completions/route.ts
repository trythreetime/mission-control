import { NextResponse } from "next/server";

const DEFAULT_PAGE_AGENT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

function proxyError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const proxyEnabled = process.env.NODE_ENV !== "production" || process.env.PAGE_AGENT_PROXY_ENABLED === "true";

  if (!proxyEnabled) {
    return proxyError(403, "Page Agent proxy is disabled in production.");
  }

  const apiKey = process.env.PAGE_AGENT_API_KEY;
  const baseURL = (process.env.PAGE_AGENT_BASE_URL ?? DEFAULT_PAGE_AGENT_BASE_URL).replace(/\/$/, "");

  if (!apiKey) {
    return proxyError(500, "Server is missing PAGE_AGENT_API_KEY.");
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch {
    return proxyError(400, "Request body must be valid JSON.");
  }

  if (!rawBody.trim()) {
    return proxyError(400, "Request body is required.");
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: rawBody,
      cache: "no-store",
      signal: request.signal,
    });
  } catch (error) {
    return proxyError(502, "Failed to reach the model provider.", error instanceof Error ? error.message : error);
  }

  const headers = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  headers.set("Cache-Control", "no-store");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
