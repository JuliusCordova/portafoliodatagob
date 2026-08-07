"""Canonical data architecture dataclasses for ATLAS DataGob.

The canonical model is intentionally platform-neutral. It describes business
concepts, entities, fields and relationships before mapping them to Firestore,
BigQuery, Cloud Storage or any future persistence engine.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field

from atlas_datagob.domain.enums import DataClassification, DataFieldType, RelationshipType


@dataclass(frozen=True)
class DataSubdomain:
    subdomain_id: str
    name: str
    description: str
    owner_role: str
    steward_role: str


@dataclass(frozen=True)
class DataDomain:
    domain_id: str
    name: str
    description: str
    owner_role: str
    steward_role: str
    subdomains: list[DataSubdomain] = field(default_factory=list)


@dataclass(frozen=True)
class DataField:
    field_id: str
    name: str
    logical_type: DataFieldType
    description: str
    required: bool = False
    primary_key: bool = False
    foreign_key: bool = False
    classification: DataClassification = DataClassification.INTERNAL
    examples: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class DataEntity:
    entity_id: str
    name: str
    domain_id: str
    subdomain_id: str
    description: str
    fields: list[DataField]
    source_systems: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class EntityRelationship:
    relationship_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    source_field_id: str
    target_field_id: str
    description: str


@dataclass(frozen=True)
class DataDictionary:
    version: str
    entities: list[DataEntity]


@dataclass(frozen=True)
class EntityRelationshipModel:
    version: str
    relationships: list[EntityRelationship]


def to_primitive(value: object) -> object:
    """Convert canonical dataclasses and enums into JSON-safe primitives."""
    def convert(item: object) -> object:
        if hasattr(item, "value"):
            return getattr(item, "value")
        if isinstance(item, list):
            return [convert(child) for child in item]
        if isinstance(item, dict):
            return {key: convert(child) for key, child in item.items()}
        return item

    if hasattr(value, "__dataclass_fields__"):
        return convert(asdict(value))
    return convert(value)
