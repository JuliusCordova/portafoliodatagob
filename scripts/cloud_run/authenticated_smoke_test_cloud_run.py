#!/usr/bin/env python3
"""Authenticated smoke checks for an ATLAS DataGob Cloud Run pilot.

This script validates the security posture introduced across Sprints 23 and 24:
API authz by role, Web identity propagation, and positive/negative permission
checks. It is non-destructive by default and only mutates demo data when an
explicit flag is enabled.
"""
from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class SmokeResult:
    name: str
    ok: bool
    detail: str


def env_url(name: str) -> str:
    value = os.getenv(name, "").strip().rstrip("/")
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    if not value.startswith(("http://", "https://")):
        raise SystemExit(f"{name} must be a URL starting with http:// or https://")
    return value


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, str(default)).strip().lower()
    return raw in {"1", "true", "yes", "y"}


def identity_headers(user_env: str, roles_env: str, *, default_user: str, default_roles: str) -> dict[str, str]:
    user = os.getenv(user_env, default_user).strip()
    roles = os.getenv(roles_env, default_roles).strip()
    if not user or not roles:
        raise SystemExit(f"{user_env} and {roles_env} must resolve to non-empty values")
    return {
        "X-ATLAS-USER": user,
        "X-ATLAS-ROLES": roles,
        "Accept": "application/json",
    }


def request_json(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 20,
) -> tuple[int, dict[str, Any]]:
    data = None
    request_headers = {"Accept": "application/json", **(headers or {})}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    req = Request(url, data=data, headers=request_headers, method=method)
    try:
        with urlopen(req, timeout=timeout) as response:  # noqa: S310 - smoke target is explicit
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return exc.code, payload


def check(name: str, fn) -> SmokeResult:
    try:
        detail = fn()
        return SmokeResult(name=name, ok=True, detail=detail)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, AssertionError, OSError) as exc:
        return SmokeResult(name=name, ok=False, detail=str(exc))


def retry_check(name: str, fn, *, attempts: int = 3, delay_seconds: int = 5) -> SmokeResult:
    last = SmokeResult(name=name, ok=False, detail="not executed")
    for attempt in range(1, attempts + 1):
        last = check(name, fn)
        if last.ok:
            return last
        if attempt < attempts:
            time.sleep(delay_seconds)
    return last


def main() -> int:
    api_url = env_url("ATLAS_API_URL")
    web_url = env_url("ATLAS_WEB_URL")
    expect_auth_enforced = env_bool("ATLAS_AUTH_SMOKE_EXPECT_ENFORCED", default=True)
    allow_mutating_reset = env_bool("ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET", default=False)

    allowed_headers = identity_headers(
        "ATLAS_AUTH_SMOKE_ALLOWED_USER",
        "ATLAS_AUTH_SMOKE_ALLOWED_ROLES",
        default_user="steward@example.com",
        default_roles="data_steward,committee_member,executive",
    )
    denied_headers = identity_headers(
        "ATLAS_AUTH_SMOKE_DENIED_USER",
        "ATLAS_AUTH_SMOKE_DENIED_ROLES",
        default_user="viewer@example.com",
        default_roles="viewer",
    )

    results: list[SmokeResult] = []

    def api_permissions_positive() -> str:
        status, payload = request_json(f"{api_url}/auth/permissions", headers=allowed_headers)
        assert status == 200, payload
        assert "supported_roles" in payload, payload
        return "API permissions reachable with allowed identity"

    def api_operational_readiness_positive() -> str:
        status, payload = request_json(f"{api_url}/ops/readiness", headers=allowed_headers)
        assert status == 200, payload
        assert payload.get("snapshot_type") == "pilot_operational_readiness", payload
        assert payload.get("status") in {"ok", "warning", "critical"}, payload
        portfolio = payload.get("portfolio", {})
        assert "total_demands" in portfolio, payload
        return f"Operational readiness reachable, status={payload.get('status')}, total_demands={portfolio.get('total_demands')}"

    def api_demo_cases_positive() -> str:
        status, payload = request_json(f"{api_url}/demo/cases", headers=allowed_headers)
        assert status == 200, payload
        count = payload.get("count", 0)
        assert count >= 10, payload
        return f"Allowed identity can read demo cases, count={count}"

    def api_demo_reset_negative() -> str:
        status, payload = request_json(f"{api_url}/demo/reset", method="POST", body={}, headers=denied_headers)
        if expect_auth_enforced:
            assert status == 403, payload
            return "Denied identity correctly blocked from demo reset with HTTP 403"
        assert status in {200, 403}, payload
        return f"Demo reset negative check observed HTTP {status}; enforcement expectation disabled"

    def web_session_positive() -> str:
        status, payload = request_json(f"{web_url}/api/session")
        assert status == 200, payload
        identity = payload.get("identity") or payload.get("session")
        assert identity, payload
        assert "mode" in identity, payload
        return f"Web session reachable, mode={identity.get('mode')}, user={identity.get('user')}"

    def web_proxy_cases_positive() -> str:
        status, payload = request_json(f"{web_url}/api/demo/cases")
        assert status == 200, payload
        count = payload.get("count", 0)
        assert count >= 10, payload
        return f"Web proxy can read demo cases with propagated identity, count={count}"

    results.append(retry_check("api_permissions_positive", api_permissions_positive))
    results.append(retry_check("api_operational_readiness_positive", api_operational_readiness_positive))
    results.append(retry_check("api_demo_cases_positive", api_demo_cases_positive))
    results.append(retry_check("api_demo_reset_negative", api_demo_reset_negative, attempts=1))
    results.append(retry_check("web_session_positive", web_session_positive))
    results.append(retry_check("web_proxy_cases_positive", web_proxy_cases_positive))

    if allow_mutating_reset:
        def web_proxy_demo_reset_positive() -> str:
            status, payload = request_json(f"{web_url}/api/demo/reset", method="POST", body={})
            assert status == 200, payload
            count = payload.get("count", 0)
            assert count >= 10, payload
            return f"Allowed Web identity executed demo reset, count={count}"

        results.append(retry_check("web_proxy_demo_reset_positive", web_proxy_demo_reset_positive, attempts=1))
    else:
        results.append(
            SmokeResult(
                "web_proxy_demo_reset_positive",
                True,
                "skipped; set ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET=true to execute mutating reset",
            )
        )

    failed = [item for item in results if not item.ok]
    print(json.dumps({"results": [item.__dict__ for item in results], "failed": len(failed)}, indent=2, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
