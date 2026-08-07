"""Load and validate canonical data architecture artifacts."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from atlas_datagob.domain.canonical import (
    DataDictionary,
    DataDomain,
    DataEntity,
    DataField,
    DataSubdomain,
    EntityRelationship,
    EntityRelationshipModel,
    to_primitive,
)
from atlas_datagob.domain.enums import DataClassification, DataFieldType, RelationshipType


def project_root() -> Path:
    """Return the repository root when commands run from the project tree."""
    return Path.cwd()


def canonical_data_dir(root: Path | None = None) -> Path:
    return (root or project_root()) / "data" / "canonical"


def synthetic_domains_path(root: Path | None = None) -> Path:
    return (root or project_root()) / "data" / "synthetic" / "domains" / "domains.json"


def load_json(path: str | Path) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_domains(path: str | Path) -> list[DataDomain]:
    raw_items = load_json(path)
    domains: list[DataDomain] = []
    for item in raw_items:  # type: ignore[assignment]
        subdomains = [
            DataSubdomain(
                subdomain_id=sub.get("subdomain_id", f"{item['domain_id']}-{idx}"),
                name=sub["name"] if isinstance(sub, dict) else str(sub),
                description=sub.get("description", "") if isinstance(sub, dict) else "",
                owner_role=sub.get("owner_role", item.get("data_owner_role", "Domain Owner")) if isinstance(sub, dict) else item.get("data_owner_role", "Domain Owner"),
                steward_role=sub.get("steward_role", item.get("steward_role", "Data Steward")) if isinstance(sub, dict) else item.get("steward_role", "Data Steward"),
            )
            for idx, sub in enumerate(item.get("subdomains", []), start=1)
        ]
        domains.append(
            DataDomain(
                domain_id=item["domain_id"],
                name=item["name"],
                description=item.get("description", ""),
                owner_role=item.get("data_owner_role", item.get("owner_role", "Domain Owner")),
                steward_role=item.get("steward_role", "Data Steward"),
                subdomains=subdomains,
            )
        )
    return domains


def _parse_field(item: dict) -> DataField:
    return DataField(
        field_id=item["field_id"],
        name=item["name"],
        logical_type=DataFieldType(item["logical_type"]),
        description=item.get("description", ""),
        required=bool(item.get("required", False)),
        primary_key=bool(item.get("primary_key", False)),
        foreign_key=bool(item.get("foreign_key", False)),
        classification=DataClassification(item.get("classification", DataClassification.INTERNAL.value)),
        examples=[str(value) for value in item.get("examples", [])],
    )


def _parse_entity(item: dict) -> DataEntity:
    return DataEntity(
        entity_id=item["entity_id"],
        name=item["name"],
        domain_id=item["domain_id"],
        subdomain_id=item["subdomain_id"],
        description=item.get("description", ""),
        fields=[_parse_field(field) for field in item.get("fields", [])],
        source_systems=[str(value) for value in item.get("source_systems", [])],
        tags=[str(value) for value in item.get("tags", [])],
    )


def load_data_dictionary(path: str | Path) -> DataDictionary:
    raw = load_json(path)
    return DataDictionary(
        version=raw.get("version", "0.1.0"),  # type: ignore[union-attr]
        entities=[_parse_entity(entity) for entity in raw.get("entities", [])],  # type: ignore[union-attr]
    )


def load_er_model(path: str | Path) -> EntityRelationshipModel:
    raw = load_json(path)
    relationships = [
        EntityRelationship(
            relationship_id=item["relationship_id"],
            source_entity_id=item["source_entity_id"],
            target_entity_id=item["target_entity_id"],
            relationship_type=RelationshipType(item["relationship_type"]),
            source_field_id=item["source_field_id"],
            target_field_id=item["target_field_id"],
            description=item.get("description", ""),
        )
        for item in raw.get("relationships", [])  # type: ignore[union-attr]
    ]
    return EntityRelationshipModel(version=raw.get("version", "0.1.0"), relationships=relationships)  # type: ignore[union-attr]


def find_entity(dictionary: DataDictionary, entity_id: str) -> DataEntity | None:
    return next((entity for entity in dictionary.entities if entity.entity_id == entity_id), None)


def entity_field_ids(entity: DataEntity) -> set[str]:
    return {field.field_id for field in entity.fields}


def validate_canonical_model(
    domains: Iterable[DataDomain],
    dictionary: DataDictionary,
    er_model: EntityRelationshipModel,
) -> list[str]:
    """Return validation errors for the canonical model. Empty list means valid."""
    errors: list[str] = []
    domain_ids = {domain.domain_id for domain in domains}
    subdomain_ids = {sub.subdomain_id for domain in domains for sub in domain.subdomains}
    entity_ids = {entity.entity_id for entity in dictionary.entities}

    if len(entity_ids) != len(dictionary.entities):
        errors.append("Duplicate entity_id values found in data dictionary.")

    for entity in dictionary.entities:
        if entity.domain_id not in domain_ids:
            errors.append(f"Entity {entity.entity_id} references unknown domain {entity.domain_id}.")
        if entity.subdomain_id not in subdomain_ids:
            errors.append(f"Entity {entity.entity_id} references unknown subdomain {entity.subdomain_id}.")
        field_ids = entity_field_ids(entity)
        if len(field_ids) != len(entity.fields):
            errors.append(f"Entity {entity.entity_id} has duplicate field_id values.")
        if not any(field.primary_key for field in entity.fields):
            errors.append(f"Entity {entity.entity_id} must define at least one primary key field.")

    for relationship in er_model.relationships:
        source = find_entity(dictionary, relationship.source_entity_id)
        target = find_entity(dictionary, relationship.target_entity_id)
        if source is None:
            errors.append(f"Relationship {relationship.relationship_id} references unknown source entity {relationship.source_entity_id}.")
            continue
        if target is None:
            errors.append(f"Relationship {relationship.relationship_id} references unknown target entity {relationship.target_entity_id}.")
            continue
        if relationship.source_field_id not in entity_field_ids(source):
            errors.append(f"Relationship {relationship.relationship_id} references unknown source field {relationship.source_field_id}.")
        if relationship.target_field_id not in entity_field_ids(target):
            errors.append(f"Relationship {relationship.relationship_id} references unknown target field {relationship.target_field_id}.")

    return errors


def dictionary_to_response(dictionary: DataDictionary) -> dict:
    return to_primitive(dictionary)  # type: ignore[return-value]


def er_model_to_response(er_model: EntityRelationshipModel) -> dict:
    return to_primitive(er_model)  # type: ignore[return-value]
