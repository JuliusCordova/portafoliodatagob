import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";

  try {
    const payload = await request.json();
    const demandId = payload.demand_id;

    if (!demandId || typeof demandId !== "string") {
      return NextResponse.json(
        { error: "ATLAS_DEMAND_UPDATE_BAD_REQUEST", message: "demand_id is required" },
        { status: 400 }
      );
    }

    const { demand_id: _demandId, ...updatePayload } = payload;
    void _demandId;

    const response = await fetch(`${backendBaseUrl}/demands/${demandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
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
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_DEMAND_UPDATE_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
