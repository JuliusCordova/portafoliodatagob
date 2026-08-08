"""Persistence configuration for ATLAS DataGob.

The MVP defaults to a local JSON repository, but the persistence boundary should
be configurable per environment. This module centralizes supported adapter names
and runtime paths so API handlers and domain services do not read environment
variables directly.
"""
from __future__ import annotations

import os
from pathlib import Path

DEFAULT_REPOSITORY_ADAPTER = "local_json"
FIRESTORE_REPOSITORY_ADAPTER = "firestore"
DEFAULT_DEMAND_BACKLOG_PATH = Path("data/runtime/demand_backlog.json")
DEFAULT_DEMO_SEED_PATH = Path("data/demo/demand_backlog_seed.json")
DEFAULT_FIRESTORE_COLLECTION = "atlas_datagob_demands"

SUPPORTED_REPOSITORY_ADAPTERS = {DEFAULT_REPOSITORY_ADAPTER, FIRESTORE_REPOSITORY_ADAPTER}


def demand_repository_adapter() -> str:
    """Return the configured demand repository adapter name."""

    return os.getenv("ATLAS_DEMAND_REPOSITORY", DEFAULT_REPOSITORY_ADAPTER).strip().lower()


def demand_backlog_path() -> Path:
    """Return the configured runtime demand backlog path."""

    return Path(os.getenv("ATLAS_DEMAND_BACKLOG_PATH", str(DEFAULT_DEMAND_BACKLOG_PATH)))


def demo_seed_path() -> Path:
    """Return the configured synthetic demo seed path."""

    return Path(os.getenv("ATLAS_DEMO_SEED_PATH", str(DEFAULT_DEMO_SEED_PATH)))


def firestore_project_id() -> str | None:
    """Return the configured Firestore project id, if any."""

    value = os.getenv("ATLAS_FIRESTORE_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
    return value.strip() if value else None


def firestore_database() -> str | None:
    """Return the configured Firestore database id, if any."""

    value = os.getenv("ATLAS_FIRESTORE_DATABASE")
    return value.strip() if value else None


def firestore_collection() -> str:
    """Return the configured Firestore collection for demand records."""

    return os.getenv("ATLAS_FIRESTORE_COLLECTION", DEFAULT_FIRESTORE_COLLECTION).strip()


def validate_persistence_configuration() -> None:
    """Raise ValueError if the configured persistence adapter is unsupported."""

    adapter = demand_repository_adapter()
    if adapter not in SUPPORTED_REPOSITORY_ADAPTERS:
        supported = ", ".join(sorted(SUPPORTED_REPOSITORY_ADAPTERS))
        raise ValueError(f"Unsupported ATLAS_DEMAND_REPOSITORY: {adapter}. Supported adapters: {supported}")

    if adapter == FIRESTORE_REPOSITORY_ADAPTER and not firestore_collection():
        raise ValueError("ATLAS_FIRESTORE_COLLECTION cannot be empty when ATLAS_DEMAND_REPOSITORY=firestore")


def persistence_configuration_snapshot() -> dict:
    """Return a safe, serializable summary of active persistence settings."""

    validate_persistence_configuration()
    return {
        "repository_adapter": demand_repository_adapter(),
        "demand_backlog_path": str(demand_backlog_path()),
        "demo_seed_path": str(demo_seed_path()),
        "firestore_project": firestore_project_id(),
        "firestore_database": firestore_database(),
        "firestore_collection": firestore_collection(),
        "supported_repository_adapters": sorted(SUPPORTED_REPOSITORY_ADAPTERS),
    }
