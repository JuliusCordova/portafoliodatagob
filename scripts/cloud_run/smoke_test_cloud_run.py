#!/usr/bin/env python3
"""Smoke test a deployed ATLAS DataGob API and Web pair.

The script is intentionally non-destructive by default. It validates that the
Cloud Run services are reachable and that the Web service can talk to the API
through its Next.js proxy. The optional demo reset check must be explicitly
enabled because it mutates the runtime backlog.
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


def request_json(url: str, *, method: str = "GET", body: dict[str, Any] | None = None, timeout: int = 20) -> dict:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=headers, method=method)
    with urlopen(req, timeout=timeout) as response:  # noqa: S310 - explicit smoke target URL
        raw = response.read().decode("utf-8")
    return json.loads(raw) if raw else {}


def request_text(url: str, *, timeout: int = 20) -> str:
    req = Request(url, headers={"Accept": "text/html,application/json"}, method="GET")
    with urlopen(req, timeout=timeout) as response:  # noqa: S310 - explicit smoke target URL
        return response.read().decode("utf-8", errors="replace")


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
    allow_mutating_reset = os.getenv("ATLAS_SMOKE_ALLOW_DEMO_RESET", "false").strip().lower() == "true"

    results: list[SmokeResult] = []

    def api_health() -> str:
        payload = request_json(f"{api_url}/health")
        assert payload.get("status") == "ok", payload
        assert payload.get("product") == "ATLAS DataGob", payload
        return f"API health ok, version={payload.get('version')}"

    def api_demo_cases() -> str:
        payload = request_json(f"{api_url}/demo/cases")
        count = payload.get("count", 0)
        assert count >= 10, payload
        return f"API demo cases reachable, count={count}"

    def web_root() -> str:
        html = request_text(web_url)
        assert "ATLAS" in html or "DataGob" in html or "__next" in html, "unexpected web payload"
        return "Web root reachable"

    def web_proxy_cases() -> str:
        payload = request_json(f"{web_url}/api/demo/cases")
        count = payload.get("count", 0)
        assert count >= 10, payload
        return f"Web proxy to API reachable, count={count}"

    results.append(retry_check("api_health", api_health))
    results.append(retry_check("api_demo_cases", api_demo_cases))
    results.append(retry_check("web_root", web_root))
    results.append(retry_check("web_proxy_cases", web_proxy_cases))

    if allow_mutating_reset:
        def web_proxy_reset() -> str:
            payload = request_json(f"{web_url}/api/demo/reset", method="POST", body={})
            count = payload.get("count", 0)
            assert count >= 10, payload
            return f"Demo reset executed through Web proxy, count={count}"

        results.append(retry_check("web_proxy_demo_reset", web_proxy_reset, attempts=1))
    else:
        results.append(SmokeResult("web_proxy_demo_reset", True, "skipped; set ATLAS_SMOKE_ALLOW_DEMO_RESET=true to execute"))

    failed = [item for item in results if not item.ok]
    print(json.dumps({"results": [item.__dict__ for item in results], "failed": len(failed)}, indent=2, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
