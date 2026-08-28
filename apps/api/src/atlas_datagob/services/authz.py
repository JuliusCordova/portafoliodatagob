"""Authorization readiness model for ATLAS DataGob.

This module intentionally does not implement a full identity provider. It defines
roles, permissions and a lightweight header-based adapter so the MVP can be run
locally without authentication while being ready for Cloud Run/IAP/OIDC hardening.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping

AUTH_MODE_DISABLED = "disabled"
AUTH_MODE_HEADER = "header"
SUPPORTED_AUTH_MODES = {AUTH_MODE_DISABLED, AUTH_MODE_HEADER}

ROLE_VIEWER = "viewer"
ROLE_DATA_OWNER = "data_owner"
ROLE_DATA_STEWARD = "data_steward"
ROLE_DATA_ARCHITECT = "data_architect"
ROLE_COMMITTEE_MEMBER = "committee_member"
ROLE_EXECUTIVE = "executive"
ROLE_PLATFORM_ADMIN = "platform_admin"

SUPPORTED_ROLES = {
    ROLE_VIEWER,
    ROLE_DATA_OWNER,
    ROLE_DATA_STEWARD,
    ROLE_DATA_ARCHITECT,
    ROLE_COMMITTEE_MEMBER,
    ROLE_EXECUTIVE,
    ROLE_PLATFORM_ADMIN,
}

READ_ONLY_PERMISSIONS = {
    "auth:read",
    "demo:read",
    "demand:read",
    "metadata:read",
    "ops:read",
    "policy:read",
}

PERMISSIONS_BY_ROLE: dict[str, set[str]] = {
    ROLE_VIEWER: set(READ_ONLY_PERMISSIONS),
    ROLE_DATA_OWNER: {
        *READ_ONLY_PERMISSIONS,
        "demand:create",
        "intake:classify",
        "intake:validate",
        "scoring:calculate",
    },
    ROLE_DATA_STEWARD: {
        *READ_ONLY_PERMISSIONS,
        "demo:reset",
        "synthetic:generate",
        "demand:create",
        "demand:update",
        "demand:score",
        "intake:classify",
        "intake:validate",
        "scoring:calculate",
    },
    ROLE_DATA_ARCHITECT: {
        *READ_ONLY_PERMISSIONS,
        "demand:update",
        "demand:status:update",
        "demand:score",
        "intake:classify",
        "intake:validate",
        "scoring:calculate",
    },
    ROLE_COMMITTEE_MEMBER: {
        *READ_ONLY_PERMISSIONS,
        "demand:update",
        "demand:status:update",
        "demand:score",
        "scoring:calculate",
    },
    ROLE_EXECUTIVE: {
        *READ_ONLY_PERMISSIONS,
        "scoring:calculate",
    },
    ROLE_PLATFORM_ADMIN: {"*"},
}


class AuthConfigurationError(ValueError):
    """Raised when auth configuration is unsupported."""


class AuthenticationError(PermissionError):
    """Raised when a caller cannot be authenticated."""


class AuthorizationError(PermissionError):
    """Raised when a caller is authenticated but lacks permission."""


@dataclass(frozen=True)
class AuthContext:
    """Resolved caller context used by the authorization layer."""

    user: str
    roles: tuple[str, ...]
    mode: str
    authenticated: bool

    def permissions(self) -> set[str]:
        resolved: set[str] = set()
        for role in self.roles:
            role_permissions = PERMISSIONS_BY_ROLE.get(role, set())
            if "*" in role_permissions:
                return {"*"}
            resolved.update(role_permissions)
        return resolved

    def to_response(self) -> dict:
        return {
            "user": self.user,
            "roles": list(self.roles),
            "mode": self.mode,
            "authenticated": self.authenticated,
            "permissions": sorted(self.permissions()),
        }


def auth_mode() -> str:
    """Return the configured authentication mode."""

    return os.getenv("ATLAS_AUTH_MODE", AUTH_MODE_DISABLED).strip().lower()


def validate_auth_configuration() -> None:
    """Fail fast when the configured auth mode is unsupported."""

    mode = auth_mode()
    if mode not in SUPPORTED_AUTH_MODES:
        supported = ", ".join(sorted(SUPPORTED_AUTH_MODES))
        raise AuthConfigurationError(f"Unsupported ATLAS_AUTH_MODE: {mode}. Supported modes: {supported}")


def _public_context() -> AuthContext:
    """Return an unauthenticated context for public routes."""

    validate_auth_configuration()
    return AuthContext(user="public", roles=(), mode=auth_mode(), authenticated=False)


def _split_roles(raw_roles: str | None) -> tuple[str, ...]:
    roles = tuple(sorted({role.strip().lower() for role in (raw_roles or "").split(",") if role.strip()}))
    unknown = [role for role in roles if role not in SUPPORTED_ROLES]
    if unknown:
        supported = ", ".join(sorted(SUPPORTED_ROLES))
        raise AuthenticationError(f"Unsupported role(s): {', '.join(unknown)}. Supported roles: {supported}")
    return roles


def context_from_headers(headers: Mapping[str, str] | None = None) -> AuthContext:
    """Resolve auth context from headers according to the configured auth mode."""

    validate_auth_configuration()
    mode = auth_mode()
    if mode == AUTH_MODE_DISABLED:
        return AuthContext(
            user="system:auth-disabled",
            roles=(ROLE_PLATFORM_ADMIN,),
            mode=mode,
            authenticated=False,
        )

    normalized_headers = {key.lower(): value for key, value in (headers or {}).items()}
    user = normalized_headers.get("x-atlas-user", "").strip()
    if not user:
        raise AuthenticationError("Missing X-ATLAS-USER header for ATLAS_AUTH_MODE=header")

    roles = _split_roles(normalized_headers.get("x-atlas-roles"))
    if not roles:
        raise AuthenticationError("Missing X-ATLAS-ROLES header for ATLAS_AUTH_MODE=header")

    return AuthContext(user=user, roles=roles, mode=mode, authenticated=True)


def has_permission(context: AuthContext, permission: str) -> bool:
    """Return whether a context has a permission."""

    permissions = context.permissions()
    return "*" in permissions or permission in permissions


def require_permission(context: AuthContext, permission: str) -> None:
    """Raise AuthorizationError when a context lacks a permission."""

    if not has_permission(context, permission):
        raise AuthorizationError(f"User {context.user} lacks required permission: {permission}")


def permission_for_request(method: str, path: str) -> str | None:
    """Map API route patterns to required permissions.

    Health, generated docs, preflight requests and OpenAPI remain public because
    platform probes, browser CORS and API documentation should still work before
    an identity provider is wired.
    """

    method = method.upper()
    path = path.rstrip("/") or "/"

    if method == "OPTIONS":
        return None
    if path in {"/health", "/openapi.json", "/docs", "/redoc"}:
        return None
    if path.startswith("/docs/") or path.startswith("/redoc/"):
        return None

    if path == "/auth/permissions" and method == "GET":
        return "auth:read"
    if path == "/ops/readiness" and method == "GET":
        return "ops:read"
    if path.startswith("/metadata/") and method == "GET":
        return "metadata:read"
    if path == "/policies" and method == "GET":
        return "policy:read"
    if path == "/scoring/calculate" and method == "POST":
        return "scoring:calculate"
    if path == "/intake/classify" and method == "POST":
        return "intake:classify"
    if path == "/intake/policy-architecture-validate" and method == "POST":
        return "intake:validate"
    if path == "/intake/conversation" and method == "POST":
        return "intake:validate"
    if path == "/intake/governance-catalog" and method == "GET":
        return "policy:read"
    if path == "/intake/business-case/document" and method == "POST":
        return "intake:validate"
    if path == "/intake/business-case/register" and method == "POST":
        return "demand:create"
    if path == "/demands/validate-and-create" and method == "POST":
        return "demand:create"
    if path == "/demands/backlog" and method == "GET":
        return "demand:read"
    if path == "/demo/cases" and method == "GET":
        return "demo:read"
    if path == "/demo/reset" and method == "POST":
        return "demo:reset"
    if path == "/synthetic-data/generate" and method == "POST":
        return "synthetic:generate"
    if path.startswith("/demands/") and path.endswith("/status") and method == "PATCH":
        return "demand:status:update"
    if path.startswith("/demands/") and path.endswith("/score") and method == "POST":
        return "demand:score"
    if path.startswith("/demands/") and method == "PATCH":
        return "demand:update"
    if path.startswith("/demands/") and method == "GET":
        return "demand:read"

    return None


def authorize_request(method: str, path: str, headers: Mapping[str, str] | None = None) -> AuthContext:
    """Authorize an HTTP request and return the resolved auth context."""

    permission = permission_for_request(method, path)
    if permission is None:
        return _public_context()

    context = context_from_headers(headers)
    require_permission(context, permission)
    return context


def auth_snapshot() -> dict:
    """Return a safe snapshot of the configured auth model."""

    validate_auth_configuration()
    return {
        "mode": auth_mode(),
        "supported_modes": sorted(SUPPORTED_AUTH_MODES),
        "supported_roles": sorted(SUPPORTED_ROLES),
        "permissions_by_role": {role: sorted(permissions) for role, permissions in PERMISSIONS_BY_ROLE.items()},
    }
