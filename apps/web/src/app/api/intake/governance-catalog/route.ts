import { NextResponse } from "next/server";
import { atlasProxyHeaders } from "../../_lib/identity";

export async function GET(request: Request) {
  const backendBaseUrl =
    process.env.ATLAS_INTERNAL_API_BASE ??
    "http://localhost:8000";

  try {
    const response = await fetch(`${backendBaseUrl}/intake/governance-catalog`, {
      method: "GET",
      headers: atlasProxyHeaders(request),
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
    const message = error instanceof Error ? error.message : "Unknown governance catalog proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_GOVERNANCE_CATALOG_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
