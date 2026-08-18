"""Progressive Business Case fact capture for Gemini ADK conversational intake."""
from __future__ import annotations

from typing import Any

try:
    from google.adk.tools.tool_context import ToolContext  # type: ignore
except Exception:  # pragma: no cover
    ToolContext = Any  # type: ignore


STRING_FIELDS = {
    "business_problem",
    "desired_outcome",
    "business_area",
    "impacted_process",
    "current_situation",
}
LIST_FIELDS = {
    "stakeholders",
    "success_metrics",
    "data_sources",
}


def update_business_context(facts: dict, tool_context: ToolContext) -> dict:
    """Merge confirmed business facts into the shared ADK session state.

    The orchestrator may call this tool repeatedly as the conversation progresses.
    Only the canonical Business Case fields are accepted; empty values never erase
    facts that were already captured in a previous turn.
    """

    current = dict(tool_context.state.get("business_context", {}))
    accepted: dict = {}
    ignored: list[str] = []

    for key, value in facts.items():
        if key in STRING_FIELDS:
            clean = value.strip() if isinstance(value, str) else ""
            if clean:
                current[key] = clean
                accepted[key] = clean
            continue

        if key in LIST_FIELDS:
            if not isinstance(value, list):
                ignored.append(key)
                continue
            clean_items = [str(item).strip() for item in value if str(item).strip()]
            if clean_items or key == "data_sources":
                # data_sources=[] is meaningful: the user explicitly does not know the sources yet.
                current[key] = list(dict.fromkeys(clean_items))
                accepted[key] = current[key]
            continue

        ignored.append(key)

    tool_context.state["business_context"] = current
    return {
        "business_context": current,
        "updated_fields": sorted(accepted),
        "ignored_fields": sorted(set(ignored)),
    }
