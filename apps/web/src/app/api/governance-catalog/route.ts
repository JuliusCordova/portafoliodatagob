import { NextResponse } from "next/server";
import { atlasIdentityHeaders, resolveWebSession } from "../_lib/identity";

type AdminOperation =
  | "create"
  | "update"
  | "delete"
  | "clone"
  | "activate"
  | "retire";

type AdminPayload = {
  operation: AdminOperation;
  kind: "policies" | "architecture_patterns";
  record_id?: string;
  version?: string;
  new_version?: string;
  record?: Record<string, unknown>;
  patch?: Record<string, unknown>;
  change_note?: string;
};

function adminBaseUrl() {
  return process.env.ATLAS_INTERNAL_GOVERNANCE_ADMIN_BASE ?? "http://localhost:8001";
}

function committeeGuard(request: Request) {
  const session = resolveWebSession(request);
  return {
    session,
    allowed: session.roles.includes("committee_member")
  };
}

function proxyError(message: string, backendBaseUrl: string) {
  return NextResponse.json(
    {
      error: "ATLAS_GOVERNANCE_ADMIN_PROXY_ERROR",
      message,
      backend_base_url: backendBaseUrl
    },
    { status: 502 }
  );
}

async function relay(response: Response, backendBaseUrl: string) {
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "x-atlas-proxy-target": backendBaseUrl
    }
  });
}

export async function GET(request: Request) {
  const { allowed } = committeeGuard(request);
  if (!allowed) {
    return NextResponse.json(
      { detail: "Governance catalog administration requires committee_member role" },
      { status: 403 }
    );
  }

  const backendBaseUrl = adminBaseUrl();
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  const kind = url.searchParams.get("kind");
  const recordId = url.searchParams.get("record_id");

  let target: string;
  if (view === "audit") {
    const limit = url.searchParams.get("limit") ?? "100";
    target = `${backendBaseUrl}/governance/catalog/audit?limit=${encodeURIComponent(limit)}`;
  } else if (kind === "policies" || kind === "architecture_patterns") {
    target = recordId
      ? `${backendBaseUrl}/governance/catalog/${kind}/${encodeURIComponent(recordId)}`
      : `${backendBaseUrl}/governance/catalog/${kind}`;
  } else {
    return NextResponse.json({ detail: "kind is required" }, { status: 400 });
  }

  try {
    const response = await fetch(target, {
      method: "GET",
      headers: atlasIdentityHeaders(request),
      cache: "no-store"
    });
    return relay(response, backendBaseUrl);
  } catch (error) {
    return proxyError(error instanceof Error ? error.message : "Unknown admin proxy error", backendBaseUrl);
  }
}

export async function POST(request: Request) {
  const { allowed } = committeeGuard(request);
  if (!allowed) {
    return NextResponse.json(
      { detail: "Governance catalog administration requires committee_member role" },
      { status: 403 }
    );
  }

  const backendBaseUrl = adminBaseUrl();
  let payload: AdminPayload;
  try {
    payload = (await request.json()) as AdminPayload;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON payload" }, { status: 400 });
  }

  const { operation, kind, record_id: recordId, version } = payload;
  if (!operation || !["policies", "architecture_patterns"].includes(kind)) {
    return NextResponse.json({ detail: "operation and valid kind are required" }, { status: 400 });
  }

  let target = `${backendBaseUrl}/governance/catalog/${kind}`;
  let method = "POST";
  let body: Record<string, unknown> = {
    change_note: payload.change_note ?? ""
  };

  if (operation === "create") {
    body = { record: payload.record ?? {}, change_note: payload.change_note ?? "" };
  } else {
    if (!recordId || !version) {
      return NextResponse.json({ detail: "record_id and version are required" }, { status: 400 });
    }
    const base = `${backendBaseUrl}/governance/catalog/${kind}/${encodeURIComponent(recordId)}/${encodeURIComponent(version)}`;
    if (operation === "update") {
      target = base;
      method = "PATCH";
      body = { patch: payload.patch ?? {}, change_note: payload.change_note ?? "" };
    } else if (operation === "delete") {
      target = base;
      method = "DELETE";
    } else if (operation === "clone") {
      target = `${base}/clone`;
      body = {
        new_version: payload.new_version ?? "",
        change_note: payload.change_note ?? ""
      };
    } else if (operation === "activate" || operation === "retire") {
      target = `${base}/${operation}`;
    } else {
      return NextResponse.json({ detail: "Unsupported operation" }, { status: 400 });
    }
  }

  try {
    const response = await fetch(target, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...atlasIdentityHeaders(request)
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    return relay(response, backendBaseUrl);
  } catch (error) {
    return proxyError(error instanceof Error ? error.message : "Unknown admin proxy error", backendBaseUrl);
  }
}
