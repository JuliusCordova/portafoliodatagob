"""Feature 58 committee-only governance catalog administration API."""
from __future__ import annotations

import os
from typing import Any

from atlas_datagob.services.authz import (
    AuthenticationError,
    ROLE_COMMITTEE_MEMBER,
    context_from_headers,
)
from atlas_datagob.services.governance_catalog_admin import (
    GovernanceCatalogAdminError,
    GovernanceCatalogConflictError,
    activate_version,
    clone_version,
    create_draft,
    delete_draft,
    get_catalog_record,
    list_audit_events,
    list_catalog_versions,
    retire_version,
    update_draft,
)

try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    FastAPI = None  # type: ignore
    HTTPException = Exception  # type: ignore
    Request = Any  # type: ignore
    CORSMiddleware = None  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


API_VERSION = "0.1.0"


def _allowed_origins() -> list[str]:
    raw = os.getenv("ATLAS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _allowed_origin_regex() -> str:
    return os.getenv("ATLAS_ALLOWED_ORIGIN_REGEX", r"https://.*\.run\.app")


def _committee_context(request: Request):
    """Require explicit Comité Operativo membership; wildcard permissions do not bypass this gate."""

    try:
        context = context_from_headers(request.headers)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if ROLE_COMMITTEE_MEMBER not in context.roles:
        raise HTTPException(
            status_code=403,
            detail="Governance catalog administration requires committee_member role",
        )
    return context


def _translate_error(exc: Exception) -> HTTPException:
    if isinstance(exc, KeyError):
        return HTTPException(status_code=404, detail=str(exc).strip("'"))
    if isinstance(exc, GovernanceCatalogConflictError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, GovernanceCatalogAdminError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail=f"Governance catalog administration failed: {exc}")


if FastAPI:
    app = FastAPI(
        title="ATLAS DataGob Governance Catalog Admin API",
        version=API_VERSION,
        description="Committee-only control plane for policies and architecture patterns.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_origin_regex=_allowed_origin_regex(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class CreateDraftPayload(BaseModel):
        record: dict[str, Any]
        change_note: str = Field(min_length=3)

    class UpdateDraftPayload(BaseModel):
        patch: dict[str, Any]
        change_note: str = Field(min_length=3)

    class ChangeNotePayload(BaseModel):
        change_note: str = Field(min_length=3)

    class ClonePayload(ChangeNotePayload):
        new_version: str = Field(min_length=1)

    @app.get("/health")
    def health() -> dict:
        return {
            "status": "ok",
            "product": "ATLAS DataGob Governance Catalog Admin",
            "version": API_VERSION,
            "access_boundary": "committee_member",
        }

    @app.get("/governance/catalog/audit")
    def governance_catalog_audit(request: Request, limit: int = 100) -> dict:
        _committee_context(request)
        try:
            return list_audit_events(limit=limit)
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.get("/governance/catalog/{kind}")
    def governance_catalog_list(kind: str, request: Request) -> dict:
        _committee_context(request)
        try:
            return list_catalog_versions(kind)
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.get("/governance/catalog/{kind}/{record_id}")
    def governance_catalog_detail(kind: str, record_id: str, request: Request) -> dict:
        _committee_context(request)
        try:
            return get_catalog_record(kind, record_id)
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.post("/governance/catalog/{kind}")
    def governance_catalog_create(kind: str, payload: CreateDraftPayload, request: Request) -> dict:
        context = _committee_context(request)
        try:
            return create_draft(
                kind,
                payload.record,
                actor=context.user,
                change_note=payload.change_note,
            )
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.patch("/governance/catalog/{kind}/{record_id}/{version}")
    def governance_catalog_update(
        kind: str,
        record_id: str,
        version: str,
        payload: UpdateDraftPayload,
        request: Request,
    ) -> dict:
        context = _committee_context(request)
        try:
            return update_draft(
                kind,
                record_id,
                version,
                payload.patch,
                actor=context.user,
                change_note=payload.change_note,
            )
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.delete("/governance/catalog/{kind}/{record_id}/{version}")
    def governance_catalog_delete_draft(
        kind: str,
        record_id: str,
        version: str,
        payload: ChangeNotePayload,
        request: Request,
    ) -> dict:
        context = _committee_context(request)
        try:
            return delete_draft(
                kind,
                record_id,
                version,
                actor=context.user,
                change_note=payload.change_note,
            )
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.post("/governance/catalog/{kind}/{record_id}/{version}/clone")
    def governance_catalog_clone(
        kind: str,
        record_id: str,
        version: str,
        payload: ClonePayload,
        request: Request,
    ) -> dict:
        context = _committee_context(request)
        try:
            return clone_version(
                kind,
                record_id,
                version,
                payload.new_version,
                actor=context.user,
                change_note=payload.change_note,
            )
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.post("/governance/catalog/{kind}/{record_id}/{version}/activate")
    def governance_catalog_activate(
        kind: str,
        record_id: str,
        version: str,
        payload: ChangeNotePayload,
        request: Request,
    ) -> dict:
        context = _committee_context(request)
        try:
            return activate_version(
                kind,
                record_id,
                version,
                actor=context.user,
                change_note=payload.change_note,
            )
        except Exception as exc:
            raise _translate_error(exc) from exc

    @app.post("/governance/catalog/{kind}/{record_id}/{version}/retire")
    def governance_catalog_retire(
        kind: str,
        record_id: str,
        version: str,
        payload: ChangeNotePayload,
        request: Request,
    ) -> dict:
        context = _committee_context(request)
        try:
            return retire_version(
                kind,
                record_id,
                version,
                actor=context.user,
                change_note=payload.change_note,
            )
        except Exception as exc:
            raise _translate_error(exc) from exc
else:
    app = None
