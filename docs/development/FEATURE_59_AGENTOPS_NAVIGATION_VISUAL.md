# Feature 59 · AgentOps navigation visual behavior

## Visual behavior

The Agent Governance sidebar keeps the ATLAS primary navigation intact.

For `/agent-governance`:

- the selected navigation item receives the coral/red active treatment used by the Business Rules reference;
- the previously selected item returns to neutral styling;
- navigation clicks preserve a top offset so the global executive header does not cover section titles;
- Artefactos and Alertas are mounted inside the AgentOps dashboard flow, immediately before the semantic footer;
- evidence panels continue to render real BigQuery data or explicit empty states; no synthetic evidence is fabricated.

## Scope

This increment is Web-only. It does not change the AgentOps API, BigQuery schema, preview runtime identity, IAM, or stable production services.
