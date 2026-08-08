import { NextResponse } from "next/server";
import { atlasJsonProxyHeaders } from "../../_lib/identity";

type StatusUpdatePayload = {
  demand_id?: string;
  status?: string;
  decision?: string;
  comment?: string;
  actor?: string;
};

export async function PATCH(request: Request) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";

  try {
    const payload = (await request.json()) as StatusUpdatePayload;

    if (!payload.demand_id || !payload.status) {
      return NextResponse.json(
        {
          error: "ATLAS_STATUS_UPDATE_VALIDATION_ERROR",
          message: "demand_id and status are required"
        },
        { status: 400 }
      );
    }

    const { demand_id, ...statusPayload } = payload;
    const response = await fetch(`${backendBaseUrl}/demands/${encodeURIComponent(demand_id)}/status`, {
      method: "PATCH",
      headers: atlasJsonProxyHeaders(request),
      body: JSON.stringify(statusPayload),
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
    const message = error instanceof Error ? error.message : "Unknown status proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_NEXT_STATUS_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
