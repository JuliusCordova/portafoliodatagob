"""Gemini ADK intake agent scaffold."""
from __future__ import annotations

from atlas_datagob.domain.models import DemandRequest
from atlas_datagob.services.classifier import classify_demand

AGENT_NAME = "atlas_intake_agent"
MODEL_NAME = "gemini-2.5-flash"

INSTRUCTION = """
Eres el Intake Classification Agent de ATLAS DataGob.
Ayudas a usuarios de negocio, domain owners y data owners a convertir ideas ambiguas en iniciativas claras.
Clasificas cada solicitud como ingeniería de datos, gobierno de datos, machine learning, agentes IA, híbrida o desconocida.
Tus respuestas deben explicar señales, confianza y preguntas faltantes.
""".strip()


def classify_text(title: str, description: str, domain_hint: str | None = None) -> dict:
    result = classify_demand(DemandRequest(title=title, description=description, domain_hint=domain_hint))
    return {
        "initiative_type": result.initiative_type.value,
        "confidence": result.confidence,
        "rationale": result.rationale,
        "signals": result.signals,
        "secondary_types": [item.value for item in result.secondary_types],
    }


def build_root_agent():
    try:
        from google.adk.agents import Agent  # type: ignore
    except Exception:
        return None
    return Agent(name=AGENT_NAME, model=MODEL_NAME, instruction=INSTRUCTION, tools=[classify_text])


root_agent = build_root_agent()
