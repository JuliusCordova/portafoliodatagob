import { NextResponse } from "next/server";
import { atlasJsonProxyHeaders } from "../../_lib/identity";

export async function GET(request: Request) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";

  try {
    const response = await fetch(`${backendBaseUrl}/demo/cases`, {
      method: "GET",
      headers: atlasJsonProxyHeaders(request),
      cache: "no-store"
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json";

    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "x-atlas-proxy-target": backendBaseUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown demo cases proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_DEMO_CASES_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
