#!/usr/bin/env python3
"""Collect ATLAS DataGob pilot operations evidence.

The script creates a Markdown evidence pack from environment variables and
optional smoke output files. It is safe by design: it does not call GCP, mutate
Cloud Run services, or execute smoke tests. Operators paste URLs/revision IDs or
feed captured outputs, and the script normalizes them into a reviewable record.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
from typing import Any

DEFAULT_OUTPUT = Path("docs/deployment/evidence/pilot-operations-evidence-latest.md")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def read_optional_text(path: str | None) -> str:
    if not path:
        return ""
    source = Path(path)
    if not source.exists():
        raise SystemExit(f"Evidence source file not found: {source}")
    return source.read_text(encoding="utf-8").strip()


def parse_json_summary(raw: str) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(payload, dict):
        return payload
    return None


def result_status(summary: dict[str, Any] | None) -> str:
    if not summary:
        return "not provided"
    failed = summary.get("failed")
    if failed == 0:
        return "passed"
    if isinstance(failed, int):
        return f"failed checks: {failed}"
    return "provided"


def mask(value: str) -> str:
    if not value:
        return "not provided"
    lowered = value.lower()
    if any(token in lowered for token in ["secret", "token", "password", "key="]):
        return "[redacted]"
    return value


def render_section(title: str, rows: list[tuple[str, str]]) -> str:
    lines = [f"## {title}", "", "| Field | Value |", "| --- | --- |"]
    for key, value in rows:
        lines.append(f"| {key} | {mask(value)} |")
    lines.append("")
    return "\n".join(lines)


def build_document(args: argparse.Namespace) -> str:
    generated_at = dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat()
    standard_smoke_raw = read_optional_text(args.standard_smoke_output)
    authenticated_smoke_raw = read_optional_text(args.authenticated_smoke_output)
    standard_summary = parse_json_summary(standard_smoke_raw)
    authenticated_summary = parse_json_summary(authenticated_smoke_raw)

    lines: list[str] = [
        "# ATLAS DataGob · Pilot Operations Evidence",
        "",
        f"Generated at: `{generated_at}`",
        "",
        "This evidence pack is intended to support controlled pilot review, release approval and operational handoff.",
        "It does not contain secrets and should not include raw credentials, tokens or private keys.",
        "",
    ]

    lines.append(
        render_section(
            "Deployment identifiers",
            [
                ("GCP project", env("ATLAS_GCP_PROJECT")),
                ("GCP region", env("ATLAS_GCP_REGION")),
                ("Artifact repository", env("ATLAS_ARTIFACT_REPOSITORY")),
                ("Image tag", env("ATLAS_IMAGE_TAG", "latest")),
                ("API service", env("ATLAS_API_SERVICE")),
                ("API URL", env("ATLAS_API_URL")),
                ("API revision", env("ATLAS_API_REVISION")),
                ("Web service", env("ATLAS_WEB_SERVICE")),
                ("Web URL", env("ATLAS_WEB_URL")),
                ("Web revision", env("ATLAS_WEB_REVISION")),
                ("Release commit", env("ATLAS_RELEASE_COMMIT")),
            ],
        )
    )

    lines.append(
        render_section(
            "Runtime configuration snapshot",
            [
                ("Demand repository", env("ATLAS_DEMAND_REPOSITORY")),
                ("Firestore project", env("ATLAS_FIRESTORE_PROJECT")),
                ("Firestore database", env("ATLAS_FIRESTORE_DATABASE", "(default)")),
                ("Firestore collection", env("ATLAS_FIRESTORE_COLLECTION")),
                ("API auth mode", env("ATLAS_AUTH_MODE")),
                ("Web identity mode", env("ATLAS_WEB_IDENTITY_MODE")),
                ("Allowed origins", env("ATLAS_ALLOWED_ORIGINS")),
                ("Allowed origin regex", env("ATLAS_ALLOWED_ORIGIN_REGEX")),
                ("Allow unauthenticated", env("ATLAS_ALLOW_UNAUTHENTICATED")),
            ],
        )
    )

    lines.append(
        render_section(
            "Smoke evidence summary",
            [
                ("Standard smoke status", result_status(standard_summary)),
                ("Authenticated smoke status", result_status(authenticated_summary)),
                ("Standard smoke output file", args.standard_smoke_output or "not provided"),
                ("Authenticated smoke output file", args.authenticated_smoke_output or "not provided"),
            ],
        )
    )

    if standard_smoke_raw:
        lines.extend(["## Standard smoke output", "", "```json", standard_smoke_raw, "```", ""])
    if authenticated_smoke_raw:
        lines.extend(["## Authenticated smoke output", "", "```json", authenticated_smoke_raw, "```", ""])

    lines.extend(
        [
            "## Pilot acceptance checklist",
            "",
            "| Check | Status | Evidence |",
            "| --- | --- | --- |",
            "| API health reachable | pending | `/health` output or standard smoke result |",
            "| Web root reachable | pending | Web URL and standard smoke result |",
            "| Web proxy reaches API | pending | `/api/demo/cases` output |",
            "| Session visible in UI | pending | UI screenshot or `/api/session` output |",
            "| Auth positive path validated | pending | authenticated smoke output |",
            "| Auth negative path validated | pending | viewer blocked on mutating endpoint |",
            "| Firestore persistence confirmed | pending | backlog records or Firestore console evidence |",
            "| Rollback service revision captured | pending | Cloud Run previous revision ID |",
            "| Pilot owner approved | pending | approver/date |",
            "",
            "## Release decision",
            "",
            "Decision: `pending`  ",
            "Approver: `pending`  ",
            "Date: `pending`  ",
            "Notes: `pending`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect ATLAS DataGob pilot operations evidence.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Markdown output path.")
    parser.add_argument("--standard-smoke-output", default=None, help="Optional JSON output from smoke_test_cloud_run.py.")
    parser.add_argument(
        "--authenticated-smoke-output",
        default=None,
        help="Optional JSON output from authenticated_smoke_test_cloud_run.py.",
    )
    args = parser.parse_args()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_document(args), encoding="utf-8")
    print(f"Pilot evidence written to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
