"""Domain enums for ATLAS DataGob."""
from __future__ import annotations

from enum import Enum


class InitiativeType(str, Enum):
    """Canonical classification for data and AI initiatives."""

    DATA_ENGINEERING = "data_engineering"
    DATA_GOVERNANCE = "data_governance"
    MACHINE_LEARNING = "machine_learning"
    AGENTIC_AI = "agentic_ai"
    HYBRID = "hybrid"
    UNKNOWN = "unknown"


class DemandStatus(str, Enum):
    """Lifecycle states for a demand request."""

    DRAFT = "draft"
    INTAKE_COMPLETED = "intake_completed"
    TRIAGE_IN_REVIEW = "triage_in_review"
    BUSINESS_CASE_READY = "business_case_ready"
    SCORED = "scored"
    OPERATIVE_REVIEW = "operative_review"
    STRATEGIC_REVIEW = "strategic_review"
    APPROVED = "approved"
    BACKLOG = "backlog"
    REFORMULATE = "reformulate"
    REJECTED = "rejected"
    MVP_IN_PROGRESS = "mvp_in_progress"
    PRODUCTION_GATE = "production_gate"
    PRODUCTION_READY = "production_ready"


class DataClassification(str, Enum):
    """Canonical data sensitivity labels for the data dictionary."""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class DataFieldType(str, Enum):
    """Portable logical data types for canonical dictionary fields."""

    STRING = "string"
    INTEGER = "integer"
    DECIMAL = "decimal"
    BOOLEAN = "boolean"
    DATE = "date"
    TIMESTAMP = "timestamp"
    JSON = "json"


class RelationshipType(str, Enum):
    """Supported entity relationship cardinalities."""

    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_ONE = "many_to_one"
    MANY_TO_MANY = "many_to_many"
