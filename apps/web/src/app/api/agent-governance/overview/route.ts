import { NextResponse } from "next/server";
import { atlasIdentityHeaders } from "../../_lib/identity";

export async function GET(request: Request) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";
  const url = new URL(request.url);
  const days = url.searchParams.get("days") ?? "14";

  try {
    const response = await fetch(`${backendBaseUrl}/agent-governance/overview?days=${encodeURIComponent(days)}`, {
      method: "GET",
      headers: atlasIdentityHeaders(request),
      cache: "no-store"
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
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
