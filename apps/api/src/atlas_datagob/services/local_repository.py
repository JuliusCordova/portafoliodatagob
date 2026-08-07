"""Local JSON repository for development and deterministic tests.

This repository is not the production persistence layer. It provides a safe,
low-cost adapter to validate the canonical model and API contracts before the
Firestore/BigQuery implementation is introduced.
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
import json
from pathlib import Path
from uuid import uuid4

from atlas_datagob.domain.enums import DemandStatus
from atlas_datagob.domain.models import DemandRequest


class JsonDemandRepository:
    """Persist demand requests as JSON documents in a local folder."""

    def __init__(self, storage_dir: str | Path) -> None:
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, demand_id: str) -> Path:
        return self.storage_dir / f"{demand_id}.json"

    def create(self, request: DemandRequest) -> dict:
        demand_id = f"DEM-{uuid4().hex[:10].upper()}"
        payload = self._request_to_payload(demand_id, request)
        self._path(demand_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return payload

    def get(self, demand_id: str) -> dict | None:
        path = self._path(demand_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def list(self) -> list[dict]:
        items = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(self.storage_dir.glob("DEM-*.json"))]
        return sorted(items, key=lambda item: item.get("created_at", ""), reverse=True)

    def update_status(self, demand_id: str, status: DemandStatus) -> dict:
        payload = self.get(demand_id)
        if payload is None:
            raise KeyError(f"Demand request not found: {demand_id}")
        payload["status"] = status.value
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._path(demand_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return payload

    @staticmethod
    def _request_to_payload(demand_id: str, request: DemandRequest) -> dict:
        payload = asdict(request)
        payload["demand_id"] = demand_id
        payload["created_at"] = request.created_at.isoformat()
        payload["updated_at"] = request.created_at.isoformat()
        payload["status"] = request.status.value
        return payload
