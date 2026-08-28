import { NextResponse } from "next/server";
import { atlasJsonProxyHeaders } from "../../../_lib/identity";

export async function POST(request: Request) {
  const backendBaseUrl =
    process.env.ATLAS_INTERNAL_API_BASE ??
    "http://localhost:8000";

  try {
    const body = await request.text();
    const response = await fetch(`${backendBaseUrl}/intake/business-case/document`, {
      method: "POST",
      headers: atlasJsonProxyHeaders(request),
      body,
      cache: "no-store"
    });

    const bytes = await response.arrayBuffer();
    return new Response(bytes, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/octet-stream",
        "content-disposition": response.headers.get("content-disposition") ?? "attachment; filename=ATLAS_Caso_de_Negocio.docx",
        "cache-control": "no-store",
        "x-atlas-proxy-target": backendBaseUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Business Case document proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_BUSINESS_CASE_DOCUMENT_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
