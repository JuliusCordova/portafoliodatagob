"""Read-only Google ADK deployment discovery for Feature 56.

A Google Reasoning Engine is modeled as an observed deployment, not as the
logical governed agent itself. This adapter never invokes or mutates an agent.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Protocol

import httpx


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class AgentDiscoveryProvider(Protocol):
    def list_deployments(self) -> list[dict]: ...


def _nested(payload: dict, *path: str) -> Any:
    current: Any = payload
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _deployment_source_kind(spec: dict) -> str | None:
    """Return only provider-declared deployment source semantics."""
    source = spec.get("deploymentSource") or spec.get("deployment_source")
    if not isinstance(source, dict):
        return None
    if source.get("package") is not None or source.get("packageSpec") is not None:
        return "package"
    if source.get("sourceCode") is not None or source.get("sourceCodeSpec") is not None:
        return "source_code"
    if source.get("container") is not None or source.get("containerSpec") is not None:
        return "container"
    for key, value in source.items():
        if value is not None:
            return str(key)
    return None


class GoogleAdkDiscoveryProvider:
    """Discover Google ADK Reasoning Engines through the Agent Platform v1 REST API."""

    def __init__(
        self,
        *,
        project_id: str | None = None,
        location: str | None = None,
        access_token: str | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.project_id = (
            project_id
            or os.getenv("ATLAS_AGENT_DISCOVERY_PROJECT")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
            or os.getenv("ATLAS_FIRESTORE_PROJECT")
        )
        self.location = (
            location
            or os.getenv("ATLAS_AGENT_DISCOVERY_LOCATION")
            or os.getenv("GOOGLE_CLOUD_LOCATION")
            or "us-central1"
        )
        if not self.project_id:
            raise RuntimeError("Feature 56 discovery requires GOOGLE_CLOUD_PROJECT or ATLAS_AGENT_DISCOVERY_PROJECT")
        self._access_token = access_token
        self._client = client

    def _token(self) -> str:
        if self._access_token:
            return self._access_token
        try:
            import google.auth  # type: ignore
            from google.auth.transport.requests import Request  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("Google authentication libraries are unavailable") from exc
        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        credentials.refresh(Request())
        token = getattr(credentials, "token", None)
        if not token:
            raise RuntimeError("Could not obtain Google Cloud access token for ADK discovery")
        return str(token)

    @property
    def endpoint(self) -> str:
        return (
            f"https://{self.location}-aiplatform.googleapis.com/v1/"
            f"projects/{self.project_id}/locations/{self.location}/reasoningEngines"
        )

    def _raw_engines(self) -> list[dict]:
        client = self._client or httpx.Client(timeout=30.0)
        close_client = self._client is None
        token = self._token()
        page_token: str | None = None
        engines: list[dict] = []
        try:
            while True:
                params = {"pageSize": "100"}
                if page_token:
                    params["pageToken"] = page_token
                response = client.get(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                    params=params,
                )
                response.raise_for_status()
                payload = response.json()
                candidates = payload.get("reasoningEngines", [])
                if isinstance(candidates, list):
                    engines.extend(item for item in candidates if isinstance(item, dict))
                page_token = payload.get("nextPageToken")
                if not page_token:
                    break
        finally:
            if close_client:
                client.close()
        return engines

    def list_deployments(self) -> list[dict]:
        observed_at = utc_now()
        deployments: list[dict] = []
        for engine in self._raw_engines():
            spec = engine.get("spec") if isinstance(engine.get("spec"), dict) else {}
            framework = str(spec.get("agentFramework") or spec.get("agent_framework") or "").strip().lower()
            if framework != "google-adk":
                continue
            resource_name = str(engine.get("name") or "")
            provider_id = resource_name.rsplit("/", 1)[-1] if resource_name else ""
            if not provider_id:
                continue
            deployment_id = f"google-adk:{provider_id}"
            deployments.append(
                {
                    "deployment_id": deployment_id,
                    "provider": "google_cloud",
                    "framework": "google-adk",
                    "provider_deployment_id": provider_id,
                    "resource_name": resource_name,
                    "display_name": engine.get("displayName") or engine.get("display_name") or provider_id,
                    "description": engine.get("description"),
                    "project_id": self.project_id,
                    "location": self.location,
                    "runtime_type": "vertex_ai_reasoning_engine",
                    "deployment_target": "reasoning_engine",
                    "model_name": None,
                    "resource_status": None,
                    "service_account": spec.get("serviceAccount") or spec.get("service_account"),
                    "identity_type": spec.get("identityType") or spec.get("identity_type"),
                    "deployment_source_kind": _deployment_source_kind(spec),
                    "labels": engine.get("labels") if isinstance(engine.get("labels"), dict) else {},
                    "created_at": engine.get("createTime") or engine.get("create_time"),
                    "updated_at": engine.get("updateTime") or engine.get("update_time"),
                    "discovery_source": "aiplatform.v1.projects.locations.reasoningEngines.list",
                    "first_seen_at": observed_at,
                    "last_seen_at": observed_at,
                    "discovery_status": "discovered",
                    "binding_status": "unbound",
                    "governed_agent_id": None,
                    "observed_metadata": {
                        "etag": engine.get("etag"),
                    },
                }
            )
        return deployments


def agent_discovery_provider() -> GoogleAdkDiscoveryProvider:
    return GoogleAdkDiscoveryProvider()
