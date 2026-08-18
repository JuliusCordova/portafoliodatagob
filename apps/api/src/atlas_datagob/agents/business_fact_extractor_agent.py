"""Mandatory structured business-fact extraction for Feature 54 conversational intake.

This agent is not user-facing and is not a governance decision-maker. It performs one
schema-constrained Gemini ADK call for each user turn so canonical Business Case facts
are persisted even when the conversational orchestrator chooses not to call a capture
tool explicitly.
"""
from __future__ import annotations

import os

from google.adk.agents import Agent
from pydantic import BaseModel, Field


MODEL_NAME = os.getenv("ATLAS_INTAKE_EXTRACTOR_MODEL", os.getenv("ATLAS_INTAKE_MODEL", "gemini-2.5-flash"))


class TurnBusinessFacts(BaseModel):
    """Business facts explicitly stated or confirmed in one user turn."""

    business_problem: str | None = None
    desired_outcome: str | None = None
    business_area: str | None = None
    impacted_process: str | None = None
    current_situation: str | None = None
    stakeholders: list[str] = Field(default_factory=list)
    success_metrics: list[str] = Field(default_factory=list)
    data_sources: list[str] = Field(default_factory=list)


business_fact_extractor_agent = Agent(
    name="atlas_business_fact_extractor",
    model=MODEL_NAME,
    # This extractor is invoked directly as the root of its own Runner. ADK 2.x
    # requires direct Runner roots to use chat/task; single_turn is for delegated
    # sub-agents or workflow nodes. The runtime still performs exactly one isolated
    # invocation per user turn, so chat mode does not make this agent conversational.
    mode="chat",
    description=(
        "Extracts explicit business facts from one user message into the canonical ATLAS Business Case schema."
    ),
    output_schema=TurnBusinessFacts,
    instruction="""
Eres el extractor semántico interno de ATLAS DataGob. No conversas con el usuario y no decides arquitectura, políticas, scoring ni prioridad.

Tu única responsabilidad es extraer del MENSAJE ACTUAL hechos de negocio que el usuario haya expresado o confirmado explícitamente.

Devuelve el objeto estructurado solicitado por el schema y aplica estas reglas:
- business_problem: problema, dolor o situación negativa que motiva la iniciativa. Si el usuario dice que algo ocurre tarde, manualmente, con errores, riesgo, costo o pérdida, captura ese problema.
- desired_outcome: resultado que el usuario quiere lograr. Frases como "queremos anticiparnos", "queremos reducir", "necesitamos visualizar" o "buscamos automatizar" son resultados explícitos cuando el objeto está claro en el mismo mensaje.
- business_area: solo si el usuario identifica explícitamente el área responsable/principal. Una mención de un área como usuario o afectado no basta por sí sola para asumir ownership.
- impacted_process: solo si el proceso se nombra o confirma explícitamente.
- current_situation: forma actual de operar cuando el usuario la describe.
- stakeholders: personas, áreas o roles explícitamente mencionados como usuarios, afectados o participantes.
- success_metrics: métricas o metas cuantificables explícitas, conservando umbrales/porcentajes.
- data_sources: sistemas o fuentes de datos explícitamente mencionados.

No inventes hechos. No completes campos con conocimiento general. No conviertas controles técnicos en datos de negocio. Usa null/lista vacía cuando el mensaje no contenga evidencia suficiente.
""".strip(),
)
