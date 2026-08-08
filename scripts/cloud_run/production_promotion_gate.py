#!/usr/bin/env python3
"""Evaluate ATLAS DataGob release-candidate promotion readiness.

The gate is intentionally non-destructive: it does not deploy, mutate data, call
Cloud Run, or read secrets. It evaluates declared evidence from environment
variables and produces a Go / Conditional Go / No-Go report that can be attached
to a pilot evidence package.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

PASS_VALUES = {"pass", "passed", "success", "succeeded", "ok", "ready", "true", "yes", "y", "1"}
WARN_VALUES = {"warn", "warning", "conditional", "conditional_go", "degraded"}
FAIL_VALUES = {"fail", "failed", "error", "blocked", "no_go", "false", "no", "n", "0"}


@dataclass(frozen=True)
class GateCheck:
    name: str
    status: str
    severity: str
    detail: str

    @property
    def passed(self) -> bool:
        return self.status == "pass"

    @property
    def warning(self) -> bool:
        return self.status == "warn"

    @property
    def failed(self) -> bool:
        return self.status == "fail"


@dataclass(frozen=True)
class GateReport:
    generated_at: str
    release_candidate: str
    decision: str
    summary: str
    checks: list[GateCheck]

    def to_dict(self) -> dict:
        return {
            "generated_at": self.generated_at,
            "release_candidate": self.release_candidate,
            "decision": self.decision,
            "summary": self.summary,
            "checks": [asdict(check) for check in self.checks],
        }


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def status_from_value(value: str, *, required: bool = True) -> str:
    normalized = value.strip().lower()
    if normalized in PASS_VALUES:
        return "pass"
    if normalized in WARN_VALUES:
        return "warn"
    if normalized in FAIL_VALUES:
        return "fail"
    if not normalized:
        return "fail" if required else "warn"
    return "warn"


def check_required_value(name: str, label: str, *, severity: str = "blocker") -> GateCheck:
    value = env(name)
    if value:
        return GateCheck(label, "pass", severity, f"{name} configured")
    return GateCheck(label, "fail", severity, f"Missing required environment variable: {name}")


def check_status(name: str, label: str, *, severity: str = "blocker", required: bool = True) -> GateCheck:
    value = env(name)
    status = status_from_value(value, required=required)
    detail = f"{name}={value or '<empty>'}"
    return GateCheck(label, status, severity, detail)


def check_evidence_path() -> GateCheck:
    raw_path = env("ATLAS_RC_EVIDENCE_PATH")
    if not raw_path:
        return GateCheck("Evidence package", "fail", "blocker", "Missing ATLAS_RC_EVIDENCE_PATH")
    path = Path(raw_path)
    if path.exists():
        return GateCheck("Evidence package", "pass", "blocker", f"Evidence path exists: {path}")
    return GateCheck("Evidence package", "fail", "blocker", f"Evidence path not found: {path}")


def build_checks() -> list[GateCheck]:
    """Build release-candidate promotion checks from declared evidence."""

    return [
        check_required_value("ATLAS_RC_ID", "Release candidate id"),
        check_required_value("ATLAS_API_URL", "API Cloud Run URL"),
        check_required_value("ATLAS_WEB_URL", "Web Cloud Run URL"),
        check_required_value("ATLAS_RC_API_REVISION", "API revision id", severity="major"),
        check_required_value("ATLAS_RC_WEB_REVISION", "Web revision id", severity="major"),
        check_status("ATLAS_RC_CI_STATUS", "CI status"),
        check_status("ATLAS_RC_CONTAINER_STATUS", "Container build status"),
        check_status("ATLAS_RC_STANDARD_SMOKE_STATUS", "Standard smoke status"),
        check_status("ATLAS_RC_AUTH_SMOKE_STATUS", "Authenticated smoke status"),
        check_status("ATLAS_RC_OPS_READINESS_STATUS", "Operational readiness status"),
        check_status("ATLAS_RC_AUTH_MODE_STATUS", "Auth posture", severity="major"),
        check_status("ATLAS_RC_PERSISTENCE_STATUS", "Persistence posture", severity="major"),
        check_status("ATLAS_RC_ROLLBACK_PLAN_STATUS", "Rollback plan", severity="major"),
        check_evidence_path(),
        check_required_value("ATLAS_RC_APPROVER", "Business / technical approver", severity="major"),
    ]


def decision_from_checks(checks: Iterable[GateCheck]) -> tuple[str, str]:
    checks = list(checks)
    blockers = [check for check in checks if check.failed and check.severity == "blocker"]
    major_failures = [check for check in checks if check.failed and check.severity != "blocker"]
    warnings = [check for check in checks if check.warning or check.failed]

    if blockers:
        return "NO-GO", f"{len(blockers)} blocker(s) must be resolved before promotion."
    if major_failures or warnings:
        return "CONDITIONAL-GO", f"No blockers, but {len(major_failures) + len(warnings)} item(s) require explicit acceptance."
    return "GO", "All release-candidate promotion checks passed."


def render_markdown(report: GateReport) -> str:
    lines = [
        f"# ATLAS DataGob Release Candidate Gate · {report.release_candidate}",
        "",
        f"Generated at: `{report.generated_at}`",
        f"Decision: **{report.decision}**",
        "",
        report.summary,
        "",
        "## Checks",
        "",
        "| Check | Status | Severity | Detail |",
        "|---|---:|---:|---|",
    ]
    for check in report.checks:
        lines.append(f"| {check.name} | {check.status} | {check.severity} | {check.detail} |")
    lines.extend(
        [
            "",
            "## Decision rule",
            "",
            "- NO-GO: at least one blocker failed.",
            "- CONDITIONAL-GO: no blockers failed, but at least one major item or warning requires explicit acceptance.",
            "- GO: all checks passed without warnings.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    checks = build_checks()
    decision, summary = decision_from_checks(checks)
    report = GateReport(
        generated_at=datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        release_candidate=env("ATLAS_RC_ID", "unidentified-rc"),
        decision=decision,
        summary=summary,
        checks=checks,
    )

    output_path = Path(env("ATLAS_RC_GATE_OUTPUT", "data/runtime/release_candidate_gate_report.md"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_markdown(report), encoding="utf-8")

    print(json.dumps(report.to_dict() | {"output_path": str(output_path)}, indent=2, ensure_ascii=False))
    return 0 if decision == "GO" else 1


if __name__ == "__main__":
    sys.exit(main())
