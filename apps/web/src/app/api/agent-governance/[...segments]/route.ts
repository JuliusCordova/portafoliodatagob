import { NextResponse } from "next/server";
import { atlasIdentityHeaders } from "../../_lib/identity";

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(request: Request, context: RouteContext) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";
  const { segments } = await context.params;
  const safePath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const target = `${backendBaseUrl}/agent-governance/${safePath}`;
  const method = request.method.toUpperCase();

  try {
    const headers: Record<string, string> = { ...atlasIdentityHeaders(request) };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;
    const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
    const response = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store"
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "x-atlas-proxy-target": backendBaseUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Agent Governance proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_AGENT_GOVERNANCE_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context);
}
