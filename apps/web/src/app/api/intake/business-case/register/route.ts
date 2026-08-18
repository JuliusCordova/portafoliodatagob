import { NextResponse } from "next/server";
import { atlasJsonProxyHeaders } from "../../../_lib/identity";

export async function POST(request: Request) {
  const backendBaseUrl =
    process.env.ATLAS_INTERNAL_API_BASE ??
    "http://localhost:8000";

  try {
    const body = await request.text();
    const response = await fetch(`${backendBaseUrl}/intake/business-case/register`, {
      method: "POST",
      headers: atlasJsonProxyHeaders(request),
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
    const message = error instanceof Error ? error.message : "Unknown Business Case registration proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_BUSINESS_CASE_REGISTER_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
