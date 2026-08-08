import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";

  try {
    const payload = await request.json();
    const response = await fetch(`${backendBaseUrl}/demands/validate-and-create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json";

    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "x-atlas-proxy-target": backendBaseUrl,
        "x-atlas-operation": "validate-and-create-demand"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_NEXT_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
