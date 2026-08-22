"""Application service for the Feature 56 Agent Governance control plane."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from atlas_datagob.services.agent_discovery import agent_discovery_provider
from atlas_datagob.services.agent_governance_repository import (
    FirestoreAgentGovernanceRepository,
    agent_governance_repository,
    utc_now,
)
from atlas_datagob.services.governance_catalog import load_policy_catalog


RISK_LEVELS = {"low", "medium", "high", "critical", "not_assessed"}
AUTONOMY_LEVELS = {"l0", "l1", "l2", "l3", "l4", "not_assessed"}
HUMAN_OVERSIGHT_VALUES = {"not_required", "required", "conditional", "not_assessed"}
CRITICALITY_LEVELS = {"low", "medium", "high", "critical", "not_assessed"}


def _policy_contract() -> tuple[list[str], list[str]]:
    policies = []
    controls: list[str] = []
    for policy in load_policy_catalog():
        if "agentic_ai" not in policy.get("applies_to", {}).get("project_types", []):
            continue
        reference = f"{policy['id']}@{policy['version']}"
        policies.append(reference)
        controls.extend(str(control) for control in policy.get("mandatory_controls", []))
    return list(dict.fromkeys(policies)), list(dict.fromkeys(controls))


def _policy_ref_for(policy_refs: list[str], policy_id: str) -> str | None:
    """Resolve the active catalog version instead of hard-coding a policy version."""
    prefix = f"{policy_id}@"
    return next((reference for reference in policy_refs if reference.startswith(prefix)), None)


def _parse_date(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _finding(agent_id: str, *, key: str, title: str, severity: str, policy_ref: str | None) -> dict:
    policy_id = None
    policy_version = None
    if policy_ref and "@" in policy_ref:
        policy_id, policy_version = policy_ref.split("@", 1)
    return {
        "finding_id": f"AGF-{uuid4().hex[:10].upper()}",
        "agent_id": agent_id,
        "check_key": key,
        "policy_id": policy_id,
        "policy_version": policy_version,
        "severity": severity,
        "status": "open",
        "title": title,
        "description": title,
        "detected_at": utc_now(),
        "resolved_at": None,
        "evidence_refs": [],
    }


class AgentGovernanceService:
    def __init__(self, repository: FirestoreAgentGovernanceRepository | None = None) -> None:
        self.repository = repository or agent_governance_repository()

    def refresh_discovery(self, *, actor: str) -> dict:
        deployments = agent_discovery_provider().list_deployments()
        result = self.repository.synchronize_deployments(deployments, actor=actor)
        result["total_google_adk"] = len(deployments)
        return result

    def list_deployments(self) -> list[dict]:
        return self.repository.list_deployments()

    def list_agents(self) -> list[dict]:
        return self.repository.list_agents()

    def get_agent(self, agent_id: str) -> dict | None:
        return self.repository.get_agent(agent_id)

    def create_agent(self, *, canonical_name: str, description: str | None, actor: str) -> dict:
        if len(canonical_name.strip()) < 3:
            raise ValueError("canonical_name must contain at least 3 characters")
        return self.repository.create_agent(canonical_name=canonical_name, description=description, actor=actor)

    def bind_deployment(
        self,
        *,
        agent_id: str,
        deployment_id: str,
        actor: str,
        environment: str | None,
        is_current: bool,
    ) -> dict:
        return self.repository.bind_deployment(
            agent_id=agent_id,
            deployment_id=deployment_id,
            actor=actor,
            environment=environment,
            is_current=is_current,
        )

    def update_profile(self, *, agent_id: str, updates: dict, actor: str) -> dict:
        risk = updates.get("risk_level")
        if risk is not None and risk not in RISK_LEVELS:
            raise ValueError(f"Unsupported risk_level: {risk}")
        autonomy = updates.get("autonomy_level")
        if autonomy is not None and autonomy not in AUTONOMY_LEVELS:
            raise ValueError(f"Unsupported autonomy_level: {autonomy}")
        oversight = updates.get("human_oversight")
        if oversight is not None and oversight not in HUMAN_OVERSIGHT_VALUES:
            raise ValueError(f"Unsupported human_oversight: {oversight}")
        criticality = updates.get("business_criticality")
        if criticality is not None and criticality not in CRITICALITY_LEVELS:
            raise ValueError(f"Unsupported business_criticality: {criticality}")
        return self.repository.update_governance_profile(agent_id, updates, actor=actor)

    def assess(self, *, agent_id: str, actor: str) -> dict:
        agent = self.repository.get_agent(agent_id)
        if agent is None:
            raise KeyError(agent_id)
        profile = dict(agent.get("governance_profile") or {})
        bindings = agent.get("bindings") or []
        policy_refs, mandatory_controls = _policy_contract()
        confirmed_controls = set(str(item) for item in profile.get("required_controls") or [])

        next_review = _parse_date(profile.get("next_review_at"))
        now = datetime.now(timezone.utc)
        checks = {
            "ownership_defined": bool(profile.get("business_owner") and profile.get("technical_owner")),
            "business_purpose_defined": bool(profile.get("business_purpose")),
            "risk_assessed": profile.get("risk_level") in (RISK_LEVELS - {"not_assessed"}),
            "autonomy_declared": profile.get("autonomy_level") in (AUTONOMY_LEVELS - {"not_assessed"}),
            "human_oversight_defined": profile.get("human_oversight") in (HUMAN_OVERSIGHT_VALUES - {"not_assessed"}),
            "data_classification_declared": bool(profile.get("data_classification")),
            "policies_identified": bool(policy_refs),
            "mandatory_controls_registered": set(mandatory_controls).issubset(confirmed_controls),
            "deployment_evidence_available": bool(bindings),
            "review_scheduled": bool(next_review and next_review > now),
        }
        score = round(sum(1 for value in checks.values() if value) / len(checks) * 100)
        status = "governed" if all(checks.values()) else "action_required"

        data_policy_ref = _policy_ref_for(policy_refs, "DATA-001")
        agent_policy_ref = _policy_ref_for(policy_refs, "AGENT-001")
        mapping = {
            "ownership_defined": ("Definir Business Owner y Technical Owner", "high", data_policy_ref),
            "business_purpose_defined": ("Documentar el propósito de negocio del agente", "medium", agent_policy_ref),
            "risk_assessed": ("Completar la evaluación de riesgo", "high", agent_policy_ref),
            "autonomy_declared": ("Declarar el nivel de autonomía", "high", agent_policy_ref),
            "human_oversight_defined": ("Definir Human-in-the-Loop / supervisión humana", "high", agent_policy_ref),
            "data_classification_declared": ("Declarar la clasificación de los datos utilizados", "high", data_policy_ref),
            "policies_identified": ("No se encontraron políticas aplicables en el catálogo gobernado", "critical", None),
            "mandatory_controls_registered": ("Registrar evidencia de los controles obligatorios aplicables", "high", agent_policy_ref),
            "deployment_evidence_available": ("Asociar al menos un deployment ADK observado", "medium", agent_policy_ref),
            "review_scheduled": ("Programar la próxima revisión de gobierno", "medium", agent_policy_ref),
        }
        findings = [
            _finding(agent_id, key=key, title=mapping[key][0], severity=mapping[key][1], policy_ref=mapping[key][2])
            for key, passed in checks.items()
            if not passed
        ]
        assessment = {
            "agent_id": agent_id,
            "assessment_id": f"AGA-{uuid4().hex[:10].upper()}",
            "status": status,
            "score": score,
            "checks": checks,
            "policy_refs": policy_refs,
            "mandatory_controls": mandatory_controls,
            "finding_ids": [item["finding_id"] for item in findings],
            "evaluated_at": utc_now(),
            "evaluator": "deterministic",
        }
        # Applicable policy references are source-of-truth catalog facts. Required controls
        # are not auto-marked as satisfied; they remain explicit governance evidence.
        self.repository.update_governance_profile(
            agent_id,
            {"applicable_policies": policy_refs, "required_controls": profile.get("required_controls", [])},
            actor=actor,
        )
        self.repository.replace_findings(agent_id, findings)
        self.repository.save_assessment(agent_id, assessment, actor=actor)
        return {"assessment": assessment, "findings": findings}

    def summary(self) -> dict:
        deployments = self.repository.list_deployments()
        agents = self.repository.list_agents()
        findings = self.repository.list_findings()
        profiles = [dict(agent.get("governance_profile") or {}) for agent in agents]
        return {
            "deployments_adk": len(deployments),
            "deployments_unbound": sum(1 for item in deployments if item.get("binding_status") != "bound"),
            "governed_agents": len(agents),
            "governed_compliant": sum(1 for item in profiles if item.get("governance_status") == "governed"),
            "not_assessed": sum(1 for item in profiles if item.get("governance_status", "not_assessed") == "not_assessed"),
            "action_required": sum(1 for item in profiles if item.get("governance_status") == "action_required"),
            "high_risk": sum(1 for item in profiles if item.get("risk_level") in {"high", "critical"}),
            "open_findings": sum(1 for item in findings if item.get("status") == "open"),
            "last_observed_at": max((item.get("last_seen_at") or "" for item in deployments), default=None),
        }


def agent_governance_service() -> AgentGovernanceService:
    return AgentGovernanceService()
