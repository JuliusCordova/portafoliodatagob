export const WEB_IDENTITY_MODE_DISABLED = "disabled";
export const WEB_IDENTITY_MODE_STATIC = "static";
export const WEB_IDENTITY_MODE_PASSTHROUGH = "passthrough";

const SUPPORTED_WEB_IDENTITY_MODES = new Set([
  WEB_IDENTITY_MODE_DISABLED,
  WEB_IDENTITY_MODE_STATIC,
  WEB_IDENTITY_MODE_PASSTHROUGH
]);

type IdentitySource = "disabled" | "static" | "passthrough" | "anonymous";

export type WebSession = {
  mode: string;
  user: string;
  roles: string[];
  authenticated: boolean;
  source: IdentitySource;
  propagated_headers: string[];
};

function configuredMode(): string {
  const mode = (process.env.ATLAS_WEB_IDENTITY_MODE ?? WEB_IDENTITY_MODE_DISABLED).trim().toLowerCase();
  return SUPPORTED_WEB_IDENTITY_MODES.has(mode) ? mode : WEB_IDENTITY_MODE_DISABLED;
}

function splitRoles(rawRoles: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (rawRoles ?? "")
        .split(",")
        .map((role) => role.trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
}

function normalizeIapEmail(rawEmail: string | null): string {
  const value = (rawEmail ?? "").trim();
  if (!value) return "";
  return value.replace(/^accounts\.google\.com:/, "").replace(/^user:/, "");
}

function headerValue(request: Request | null | undefined, name: string): string {
  return request?.headers.get(name)?.trim() ?? "";
}

export function resolveWebSession(request?: Request | null): WebSession {
  const mode = configuredMode();

  if (mode === WEB_IDENTITY_MODE_DISABLED) {
    return {
      mode,
      user: "system:web-identity-disabled",
      roles: ["platform_admin"],
      authenticated: false,
      source: "disabled",
      propagated_headers: []
    };
  }

  if (mode === WEB_IDENTITY_MODE_STATIC) {
    const user = process.env.ATLAS_WEB_DEMO_USER?.trim() || "demo.operator@atlas.local";
    const roles = splitRoles(process.env.ATLAS_WEB_DEMO_ROLES || "data_steward,committee_member,executive");
    return {
      mode,
      user,
      roles,
      authenticated: true,
      source: "static",
      propagated_headers: ["x-atlas-user", "x-atlas-roles"]
    };
  }

  const atlasUser = headerValue(request, "x-atlas-user");
  const iapUser = normalizeIapEmail(headerValue(request, "x-goog-authenticated-user-email"));
  const user = atlasUser || iapUser || process.env.ATLAS_WEB_DEMO_USER?.trim() || "anonymous@atlas.local";
  const roles = splitRoles(headerValue(request, "x-atlas-roles") || process.env.ATLAS_WEB_DEMO_ROLES || "viewer");

  return {
    mode,
    user,
    roles,
    authenticated: Boolean(atlasUser || iapUser),
    source: atlasUser || iapUser ? "passthrough" : "anonymous",
    propagated_headers: ["x-atlas-user", "x-atlas-roles"]
  };
}

export function atlasIdentityHeaders(request?: Request | null): Record<string, string> {
  const session = resolveWebSession(request);
  if (session.mode === WEB_IDENTITY_MODE_DISABLED) return {};

  return {
    "X-ATLAS-USER": session.user,
    "X-ATLAS-ROLES": session.roles.join(",")
  };
}

export function atlasJsonProxyHeaders(request?: Request | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...atlasIdentityHeaders(request)
  };
}
