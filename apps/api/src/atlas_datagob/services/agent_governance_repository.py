"""Persistence boundary for Feature 56 Agent Governance.

The provider estate and ATLAS governance metadata are deliberately stored in
separate collections. Provider discovery is append/update-only: a deployment
that disappears from a later refresh is marked ``not_observed`` instead of
being deleted, preserving evidence and release history.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _collection_name(env_name: str, default: str) -> str:
    return os.getenv(env_name, default).strip() or default


class FirestoreAgentGovernanceRepository:
    """Firestore repository for observed deployments and governed agents."""

    def __init__(
        self,
        *,
        project_id: str | None = None,
        database: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.project_id = project_id or os.getenv("ATLAS_FIRESTORE_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.database = database or os.getenv("ATLAS_FIRESTORE_DATABASE") or "(default)"
        self._client = client
        self.deployments_collection = _collection_name(
            "ATLAS_AGENT_DEPLOYMENTS_COLLECTION", "atlas_agent_deployments"
        )
        self.agents_collection = _collection_name("ATLAS_AGENTS_COLLECTION", "atlas_agents")
        self.bindings_collection = _collection_name(
            "ATLAS_AGENT_BINDINGS_COLLECTION", "atlas_agent_deployment_bindings"
        )
        self.profiles_collection = _collection_name(
            "ATLAS_AGENT_GOVERNANCE_COLLECTION", "atlas_agent_governance"
        )
        self.events_collection = _collection_name(
            "ATLAS_AGENT_GOVERNANCE_EVENTS_COLLECTION", "atlas_agent_governance_events"
        )
        self.findings_collection = _collection_name(
            "ATLAS_AGENT_FINDINGS_COLLECTION", "atlas_agent_findings"
        )

    @property
    def client(self) -> Any:
        if self._client is None:
            try:
                from google.cloud import firestore  # type: ignore
            except ImportError as exc:  # pragma: no cover
                raise RuntimeError("Feature 56 requires google-cloud-firestore") from exc
            kwargs: dict[str, str] = {}
            if self.project_id:
                kwargs["project"] = self.project_id
            if self.database:
                kwargs["database"] = self.database
            self._client = firestore.Client(**kwargs)
        return self._client

    def _collection(self, name: str) -> Any:
        return self.client.collection(name)

    @staticmethod
    def _stream(collection: Any) -> list[dict]:
        records: list[dict] = []
        for document in collection.stream():
            payload = document.to_dict() or {}
            payload.setdefault("_document_id", document.id)
            records.append(payload)
        return records

    def list_deployments(self) -> list[dict]:
        records = self._stream(self._collection(self.deployments_collection))
        return sorted(records, key=lambda item: item.get("created_at") or "", reverse=True)

    def get_deployment(self, deployment_id: str) -> dict | None:
        snapshot = self._collection(self.deployments_collection).document(deployment_id).get()
        if not snapshot.exists:
            return None
        payload = snapshot.to_dict() or {}
        payload.setdefault("deployment_id", deployment_id)
        return payload

    def synchronize_deployments(self, observed: list[dict], *, actor: str) -> dict:
        """Idempotently synchronize provider snapshots without deleting history."""

        now = utc_now()
        collection = self._collection(self.deployments_collection)
        existing = {item.get("deployment_id"): item for item in self.list_deployments() if item.get("deployment_id")}
        seen: set[str] = set()
        inserted = 0
        updated = 0

        for item in observed:
            deployment_id = str(item["deployment_id"])
            seen.add(deployment_id)
            previous = existing.get(deployment_id, {})
            payload = {
                **previous,
                **item,
                "deployment_id": deployment_id,
                "first_seen_at": previous.get("first_seen_at") or item.get("first_seen_at") or now,
                "last_seen_at": item.get("last_seen_at") or now,
                "discovery_status": "discovered",
                "binding_status": previous.get("binding_status") or item.get("binding_status") or "unbound",
                "governed_agent_id": previous.get("governed_agent_id"),
            }
            payload.pop("_document_id", None)
            collection.document(deployment_id).set(payload)
            if previous:
                updated += 1
            else:
                inserted += 1

        not_observed = 0
        for deployment_id, previous in existing.items():
            if deployment_id in seen:
                continue
            payload = {**previous, "discovery_status": "not_observed", "last_refresh_at": now}
            payload.pop("_document_id", None)
            collection.document(deployment_id).set(payload)
            not_observed += 1

        self.append_event(
            event_type="agent_discovery_refreshed",
            actor=actor,
            entity_id="agent-estate",
            payload={
                "observed": len(observed),
                "inserted": inserted,
                "updated": updated,
                "not_observed": not_observed,
            },
        )
        return {
            "observed": len(observed),
            "inserted": inserted,
            "updated": updated,
            "not_observed": not_observed,
            "refreshed_at": now,
        }

    def list_agents(self) -> list[dict]:
        records = self._stream(self._collection(self.agents_collection))
        profiles = {item.get("agent_id"): item for item in self._stream(self._collection(self.profiles_collection))}
        for agent in records:
            agent_id = agent.get("agent_id")
            if agent_id in profiles:
                agent["governance_profile"] = profiles[agent_id]
            bindings = self.list_bindings(agent_id=agent_id)
            agent["bindings"] = bindings
            agent["deployments"] = [
                deployment
                for binding in bindings
                if (deployment := self.get_deployment(str(binding.get("deployment_id")))) is not None
            ]
        return sorted(records, key=lambda item: item.get("created_at") or "", reverse=True)

    def get_agent(self, agent_id: str) -> dict | None:
        snapshot = self._collection(self.agents_collection).document(agent_id).get()
        if not snapshot.exists:
            return None
        agent = snapshot.to_dict() or {}
        agent.setdefault("agent_id", agent_id)
        profile = self.get_governance_profile(agent_id)
        agent["governance_profile"] = profile
        bindings = self.list_bindings(agent_id=agent_id)
        agent["bindings"] = bindings
        agent["deployments"] = [
            deployment
            for binding in bindings
            if (deployment := self.get_deployment(str(binding.get("deployment_id")))) is not None
        ]
        agent["findings"] = self.list_findings(agent_id=agent_id)
        return agent

    def create_agent(self, *, canonical_name: str, description: str | None, actor: str) -> dict:
        now = utc_now()
        agent_id = f"AGT-{uuid4().hex[:8].upper()}"
        agent = {
            "agent_id": agent_id,
            "canonical_name": canonical_name.strip(),
            "description": (description or "").strip() or None,
            "governance_status": "not_assessed",
            "created_at": now,
            "updated_at": now,
        }
        self._collection(self.agents_collection).document(agent_id).set(agent)
        self._collection(self.profiles_collection).document(agent_id).set(
            {
                "agent_id": agent_id,
                "business_owner": None,
                "technical_owner": None,
                "business_purpose": None,
                "business_area": None,
                "environment": None,
                "business_criticality": "not_assessed",
                "autonomy_level": "not_assessed",
                "risk_level": "not_assessed",
                "data_classification": [],
                "human_oversight": "not_assessed",
                "writes_to_systems": None,
                "applicable_policies": [],
                "required_controls": [],
                "governance_status": "not_assessed",
                "last_assessed_at": None,
                "next_review_at": None,
                "notes": None,
                "updated_at": now,
                "updated_by": actor,
            }
        )
        self.append_event("governed_agent_created", actor, agent_id, {"canonical_name": canonical_name})
        return agent

    def get_governance_profile(self, agent_id: str) -> dict:
        snapshot = self._collection(self.profiles_collection).document(agent_id).get()
        return (snapshot.to_dict() or {}) if snapshot.exists else {"agent_id": agent_id}

    def update_governance_profile(self, agent_id: str, updates: dict, *, actor: str) -> dict:
        if self.get_agent_shallow(agent_id) is None:
            raise KeyError(agent_id)
        now = utc_now()
        current = self.get_governance_profile(agent_id)
        allowed = {
            "business_owner", "technical_owner", "business_purpose", "business_area",
            "environment", "business_criticality", "autonomy_level", "risk_level",
            "data_classification", "human_oversight", "writes_to_systems",
            "applicable_policies", "required_controls", "next_review_at", "notes",
        }
        cleaned = {key: value for key, value in updates.items() if key in allowed}
        profile = {**current, **cleaned, "agent_id": agent_id, "updated_at": now, "updated_by": actor}
        self._collection(self.profiles_collection).document(agent_id).set(profile)
        self._collection(self.agents_collection).document(agent_id).update({"updated_at": now})
        self.append_event("governance_profile_updated", actor, agent_id, {"updated_fields": sorted(cleaned)})
        return profile

    def get_agent_shallow(self, agent_id: str) -> dict | None:
        snapshot = self._collection(self.agents_collection).document(agent_id).get()
        return (snapshot.to_dict() or {}) if snapshot.exists else None

    def list_bindings(self, *, agent_id: str | None = None) -> list[dict]:
        records = self._stream(self._collection(self.bindings_collection))
        if agent_id:
            records = [item for item in records if item.get("agent_id") == agent_id]
        return sorted(records, key=lambda item: item.get("bound_at") or "", reverse=True)

    def bind_deployment(
        self,
        *,
        agent_id: str,
        deployment_id: str,
        actor: str,
        environment: str | None = None,
        is_current: bool = False,
    ) -> dict:
        if self.get_agent_shallow(agent_id) is None:
            raise KeyError(agent_id)
        deployment = self.get_deployment(deployment_id)
        if deployment is None:
            raise KeyError(deployment_id)
        existing_agent = deployment.get("governed_agent_id")
        if existing_agent and existing_agent != agent_id:
            raise ValueError(f"Deployment is already bound to {existing_agent}")

        now = utc_now()
        if is_current:
            for binding in self.list_bindings(agent_id=agent_id):
                if binding.get("is_current"):
                    doc_id = binding.get("binding_id") or binding.get("_document_id")
                    if doc_id:
                        self._collection(self.bindings_collection).document(str(doc_id)).update({"is_current": False})

        binding_id = f"ADB-{uuid4().hex[:8].upper()}"
        binding = {
            "binding_id": binding_id,
            "agent_id": agent_id,
            "deployment_id": deployment_id,
            "environment": environment,
            "lifecycle_status": "active",
            "is_current": bool(is_current),
            "binding_source": "human_confirmed",
            "bound_by": actor,
            "bound_at": now,
        }
        self._collection(self.bindings_collection).document(binding_id).set(binding)
        self._collection(self.deployments_collection).document(deployment_id).update(
            {"binding_status": "bound", "governed_agent_id": agent_id}
        )
        self.append_event("deployment_bound", actor, agent_id, {"deployment_id": deployment_id, "binding_id": binding_id})
        return binding

    def replace_findings(self, agent_id: str, findings: list[dict]) -> None:
        """Archive open findings and append the current assessment findings.

        The method keeps its historical name for service compatibility, but its
        semantics are intentionally append-preserving: governance evidence must
        never disappear just because a later assessment was executed.
        """

        collection = self._collection(self.findings_collection)
        now = utc_now()
        for item in self.list_findings(agent_id=agent_id):
            if item.get("status") != "open":
                continue
            document_id = item.get("_document_id") or item.get("finding_id")
            if not document_id:
                continue
            archived = {
                **item,
                "status": "closed",
                "resolved_at": now,
                "resolution": "superseded_by_reassessment",
            }
            archived.pop("_document_id", None)
            collection.document(str(document_id)).set(archived)

        for finding in findings:
            collection.document(str(finding["finding_id"])).set(finding)

    def list_findings(self, *, agent_id: str | None = None) -> list[dict]:
        records = self._stream(self._collection(self.findings_collection))
        if agent_id:
            records = [item for item in records if item.get("agent_id") == agent_id]
        return sorted(records, key=lambda item: item.get("detected_at") or "", reverse=True)

    def save_assessment(self, agent_id: str, assessment: dict, *, actor: str) -> None:
        profile = self.get_governance_profile(agent_id)
        profile.update(
            {
                "governance_status": assessment["status"],
                "last_assessed_at": assessment["evaluated_at"],
                "last_assessment": assessment,
                "updated_at": utc_now(),
                "updated_by": actor,
            }
        )
        self._collection(self.profiles_collection).document(agent_id).set(profile)
        self._collection(self.agents_collection).document(agent_id).update(
            {"governance_status": assessment["status"], "updated_at": utc_now()}
        )
        self.append_event("governance_assessed", actor, agent_id, {"assessment_id": assessment["assessment_id"], "status": assessment["status"], "score": assessment["score"]})

    def append_event(self, event_type: str, actor: str, entity_id: str, payload: dict) -> dict:
        event_id = f"AGE-{uuid4().hex[:10].upper()}"
        event = {
            "event_id": event_id,
            "event_type": event_type,
            "entity_id": entity_id,
            "actor": actor,
            "timestamp": utc_now(),
            "payload": payload,
        }
        self._collection(self.events_collection).document(event_id).set(event)
        return event


def agent_governance_repository() -> FirestoreAgentGovernanceRepository:
    """Build the configured Feature 56 repository."""
    return FirestoreAgentGovernanceRepository()
