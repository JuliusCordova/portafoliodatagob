"use client";

import { useEffect, useMemo, useState } from "react";

type CommitteeRoute = {
  route?: string;
  committee_stage?: string;
  required_reviewers?: string[];
  required_review_roles?: string[];
  suggested_decision: string;
  data_architect_final_validation_required?: boolean;
};

type ValidationResult = {
  classification: {
    initiative_type: string;
    confidence: number;
    rationale: string;
  };
  architecture: {
    architecture_pattern: string;
    is_compliant: boolean;
    missing_components: string[];
    architecture_gaps: string[];
    human_architecture_review_required: boolean;
  };
  policy_gaps: string[];
  finops_gaps: string[];
  operative_committee: CommitteeRoute;
  committee_summary: string;
};

type DemandEvent = {
  event_id?: string;
  timestamp: string;
  type: string;
  actor: string;
  from_status?: string | null;
  to_status: string;
  decision?: string | null;
  comment: string;
};

type DemandRecord = {
  demand_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  decision: string;
  current_stage: string;
  request: {
    title: string;
    description: string;
    requester_area: string;
    requester_role: string;
    domain_hint?: string | null;
    target_consumption?: string | null;
  };
  classification: ValidationResult["classification"];
  architecture: ValidationResult["architecture"];
  policy_gaps: string[];
  architecture_gaps: string[];
  finops_gaps: string[];
  committee: CommitteeRoute;
  committee_summary: string;
  agent_trace: string[];
  events: DemandEvent[];
};

type PersistedValidationResponse = {
  demand: DemandRecord;
  validation: ValidationResult;
};

type BacklogResponse = {
  count: number;
  demands: DemandRecord[];
};

type RuntimeMode = "demo" | "api" | "error" | "loading";

const defaultResult: ValidationResult = {
  classification: {
    initiative_type: "data_engineering",
    confidence: 0.82,
    rationale: "La solicitud combina señales de ingesta, calidad, arquitectura y consumo ejecutivo."
  },
  architecture: {
    architecture_pattern: "data_engineering",
    is_compliant: false,
    missing_components: ["reconciliation", "semantic_model", "finops"],
    architecture_gaps: [
      "Faltan componentes obligatorios del patrón aprobado: reconciliation, semantic_model, finops.",
      "La arquitectura debe ser validada por el Arquitecto de Datos antes de pasar a scoring."
    ],
    human_architecture_review_required: true
  },
  policy_gaps: [
    "Definir puntos de reconciliación/cuadratura desde ingesta hasta capa Gold/consumo.",
    "Asignar Data Owner y Data Steward antes de Comité Operativo."
  ],
  finops_gaps: [
    "Definir owner de costo, presupuesto, alertas y estrategia de consumo.",
    "Estimar volumen, frecuencia de consulta y estrategia de particionado/clustering."
  ],
  operative_committee: {
    route: "operative_committee_architect_review",
    required_reviewers: ["Data Architect", "Domain Owner", "Data Steward"],
    suggested_decision: "architect_review",
    data_architect_final_validation_required: true
  },
  committee_summary:
    "La solicitud fue estructurada por el intake multiagente. Presenta brechas de arquitectura, gobierno y FinOps que deben ser revisadas en Comité Operativo con validación final del Arquitecto de Datos."
};

const architectureFlow = [
  "Fuentes",
  "Extracción",
  "Landing",
  "Bronze",
  "Silver",
  "Gold",
  "Feature / Knowledge",
  "Serving",
  "BI / ML / GenAI",
  "FinOps"
];

const stageStatus: Record<string, "ok" | "gap" | "review"> = {
  Fuentes: "ok",
  Extracción: "ok",
  Landing: "ok",
  Bronze: "ok",
  Silver: "ok",
  Gold: "ok",
  "Feature / Knowledge": "review",
  Serving: "ok",
  "BI / ML / GenAI": "review",
  FinOps: "gap"
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "risk" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function GapList({ title, items, tone }: { title: string; items: string[]; tone: "warn" | "risk" }) {
  return (
    <article className="card compact">
      <div className="section-title-row">
        <h3>{title}</h3>
        <Pill tone={items.length ? tone : "ok"}>{items.length ? `${items.length} brechas` : "Sin brechas"}</Pill>
      </div>
      <ul className="gap-list">
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No se detectaron brechas en esta categoría.</li>}
      </ul>
    </article>
  );
}

function runtimeLabel(mode: RuntimeMode) {
  if (mode === "api") return "API conectada";
  if (mode === "error") return "Error conexión";
  if (mode === "loading") return "Sincronizando";
  return "Demo local";
}

function committeeReviewers(result: ValidationResult): string[] {
  return result.operative_committee.required_reviewers ?? result.operative_committee.required_review_roles ?? [];
}

function demandReviewers(demand: DemandRecord): string[] {
  return demand.committee.required_reviewers ?? demand.committee.required_review_roles ?? [];
}

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusTone(status: string): "neutral" | "ok" | "warn" | "risk" {
  if (status.includes("approved")) return "ok";
  if (status.includes("rejected")) return "risk";
  if (status.includes("reformulation") || status.includes("review")) return "warn";
  return "neutral";
}

function demandGapCount(demand: DemandRecord) {
  return demand.policy_gaps.length + demand.architecture_gaps.length + demand.finops_gaps.length;
}

export default function HomePage() {
  const [title, setTitle] = useState("Validación de calidad de clientes para dashboard ejecutivo");
  const [description, setDescription] = useState(
    "Necesitamos integrar datos de clientes desde fuentes operacionales, llevarlos a Bronze, Silver y Gold, crear controles de calidad y publicar un dashboard ejecutivo. Aún no se ha definido cuadratura, modelo semántico ni presupuesto."
  );
  const [targetConsumption, setTargetConsumption] = useState("BI ejecutivo / dashboard");
  const [result, setResult] = useState<ValidationResult>(defaultResult);
  const [persistedDemand, setPersistedDemand] = useState<DemandRecord | null>(null);
  const [backlog, setBacklog] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  const [backlogMessage, setBacklogMessage] = useState("Backlog pendiente de sincronización.");
  const [mode, setMode] = useState<RuntimeMode>("demo");
  const [connectionMessage, setConnectionMessage] = useState("Esperando validación del requerimiento.");
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const readinessScore = useMemo(() => {
    const gaps = result.policy_gaps.length + result.finops_gaps.length + result.architecture.architecture_gaps.length;
    return Math.max(25, 100 - gaps * 12);
  }, [result]);

  const selectedDemand = useMemo(() => {
    return backlog.find((item) => item.demand_id === selectedDemandId) ?? persistedDemand;
  }, [backlog, persistedDemand, selectedDemandId]);

  const committeeQueue = useMemo(() => backlog.filter((item) => item.status.includes("review")).length, [backlog]);
  const approvedCount = useMemo(() => backlog.filter((item) => item.status.includes("approved")).length, [backlog]);
  const eventCount = useMemo(() => backlog.reduce((total, item) => total + item.events.length, 0), [backlog]);

  async function loadBacklog(highlightDemandId?: string) {
    try {
      setBacklogLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Backlog failed with HTTP ${response.status}: ${responseText}`);
      }
      const payload = JSON.parse(responseText) as BacklogResponse;
      setBacklog(payload.demands);
      setBacklogMessage(`Backlog sincronizado: ${payload.count} solicitudes registradas.`);

      if (highlightDemandId) {
        setSelectedDemandId(highlightDemandId);
      } else if (!selectedDemandId && payload.demands.length) {
        setSelectedDemandId(payload.demands[0].demand_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al sincronizar backlog.";
      setBacklogMessage(`No se pudo sincronizar backlog: ${message}`);
    } finally {
      setBacklogLoading(false);
    }
  }

  useEffect(() => {
    void loadBacklog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validateRequest() {
    try {
      setMode("loading");
      setConnectionMessage("Validando y guardando solicitud en backlog por proxy interno Next.js → FastAPI localhost:8000...");
      const response = await fetch("/api/intake/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          requester_area: "Negocio",
          requester_role: "Domain Owner",
          domain_hint: "Clientes",
          target_consumption: targetConsumption
        })
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Proxy/API validation failed with HTTP ${response.status}: ${responseText}`);
      }
      const payload = JSON.parse(responseText) as PersistedValidationResponse;
      setMode("api");
      setPersistedDemand(payload.demand);
      setSelectedDemandId(payload.demand.demand_id);
      setConnectionMessage(`Solicitud ${payload.demand.demand_id} validada y guardada en backlog.`);
      setResult(payload.validation);
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al conectar con el API.";
      setMode("error");
      setConnectionMessage(`No se pudo conectar con el API: ${message}`);
      setResult(defaultResult);
      setPersistedDemand(null);
    }
  }

  async function updateDemandStatus(status: string, decision: string, comment: string) {
    if (!selectedDemand) return;

    try {
      setActionLoading(true);
      const response = await fetch("/api/demands/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demand_id: selectedDemand.demand_id,
          status,
          decision,
          actor: "Data Architect",
          comment
        })
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Status update failed with HTTP ${response.status}: ${responseText}`);
      }
      const payload = JSON.parse(responseText) as { demand: DemandRecord };
      setPersistedDemand(payload.demand);
      setSelectedDemandId(payload.demand.demand_id);
      setBacklog((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setBacklogMessage(`Estado actualizado: ${payload.demand.demand_id} → ${labelize(payload.demand.status)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al actualizar estado.";
      setBacklogMessage(`No se pudo actualizar el estado: ${message}`);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 08</p>
          <h1>Cockpit ejecutivo de demanda, decisiones y trazabilidad</h1>
          <p className="hero-copy">
            Captura el requerimiento, valida políticas y arquitectura, registra la solicitud en backlog y permite al comité cambiar estados dejando evidencia auditable.
          </p>
        </div>
        <div className="hero-badge">
          <span>Modo</span>
          <strong>{runtimeLabel(mode)}</strong>
        </div>
      </section>

      <section className={`status-card status-${mode}`}>
        <strong>Estado de conexión</strong>
        <span>{connectionMessage}</span>
      </section>

      <section className="status-card status-api">
        <strong>Backlog persistente</strong>
        <span>{backlogLoading ? "Sincronizando backlog..." : backlogMessage}</span>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Solicitudes</span>
          <strong>{backlog.length}</strong>
          <small>Backlog persistente</small>
        </article>
        <article className="metric-card">
          <span>En revisión</span>
          <strong>{committeeQueue}</strong>
          <small>Comité / Arquitecto</small>
        </article>
        <article className="metric-card">
          <span>Aprobadas</span>
          <strong>{approvedCount}</strong>
          <small>Listas para scoring</small>
        </article>
        <article className="metric-card">
          <span>Eventos</span>
          <strong>{eventCount}</strong>
          <small>Trazabilidad registrada</small>
        </article>
      </section>

      <section className="main-grid">
        <article className="card intake-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow small">Paso 1</p>
              <h2>Nueva solicitud de negocio</h2>
            </div>
            <Pill tone="neutral">Intake conversation agent</Pill>
          </div>

          <label>
            Título del requerimiento
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Descripción
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={8} />
          </label>
          <label>
            Consumo esperado
            <select value={targetConsumption} onChange={(event) => setTargetConsumption(event.target.value)}>
              <option>BI ejecutivo / dashboard</option>
              <option>Machine Learning</option>
              <option>GenAI / RAG / agente</option>
              <option>Streaming / tiempo real</option>
            </select>
          </label>

          <button onClick={validateRequest} disabled={mode === "loading"}>
            {mode === "loading" ? "Validando..." : "Validar y guardar solicitud"}
          </button>
        </article>

        <article className="card result-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow small">Paso 2</p>
              <h2>Resultado del intake multiagente</h2>
            </div>
            <Pill tone={result.architecture.human_architecture_review_required ? "warn" : "ok"}>
              {result.architecture.human_architecture_review_required ? "Revisión humana" : "Sin alerta crítica"}
            </Pill>
          </div>

          <div className="classification-box">
            <span>Clasificación</span>
            <strong>{result.classification.initiative_type}</strong>
            <p>{result.classification.rationale}</p>
          </div>

          <div className="committee-box">
            <h3>Ruta Comité Operativo</h3>
            <p>{result.committee_summary}</p>
            <div className="reviewers">
              {committeeReviewers(result).map((reviewer) => (
                <Pill key={reviewer} tone={reviewer === "Data Architect" ? "risk" : "neutral"}>{reviewer}</Pill>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="card backlog-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow small">Paso 3</p>
            <h2>Backlog de demanda gobernada</h2>
          </div>
          <button className="secondary-button" onClick={() => void loadBacklog()} disabled={backlogLoading}>
            {backlogLoading ? "Sincronizando" : "Refrescar backlog"}
          </button>
        </div>

        <div className="backlog-cockpit">
          <div className="backlog-table-wrap">
            <table className="backlog-table">
              <thead>
                <tr>
                  <th>Solicitud</th>
                  <th>Estado</th>
                  <th>Patrón</th>
                  <th>Brechas</th>
                  <th>Decisión</th>
                </tr>
              </thead>
              <tbody>
                {backlog.length ? backlog.map((demand) => (
                  <tr
                    key={demand.demand_id}
                    className={selectedDemand?.demand_id === demand.demand_id ? "active-row" : ""}
                    onClick={() => setSelectedDemandId(demand.demand_id)}
                  >
                    <td>
                      <strong>{demand.demand_id}</strong>
                      <small>{demand.request.title}</small>
                    </td>
                    <td><Pill tone={statusTone(demand.status)}>{labelize(demand.status)}</Pill></td>
                    <td>{labelize(demand.architecture.architecture_pattern)}</td>
                    <td>{demandGapCount(demand)}</td>
                    <td>{labelize(demand.decision)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="empty-state">Aún no hay solicitudes registradas. Crea la primera con el formulario de intake.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <aside className="demand-detail">
            {selectedDemand ? (
              <>
                <div className="detail-header">
                  <div>
                    <span>Detalle de solicitud</span>
                    <h3>{selectedDemand.demand_id}</h3>
                  </div>
                  <Pill tone={statusTone(selectedDemand.status)}>{labelize(selectedDemand.status)}</Pill>
                </div>
                <h4>{selectedDemand.request.title}</h4>
                <p>{selectedDemand.committee_summary}</p>

                <div className="detail-kv">
                  <span>Consumo</span><strong>{selectedDemand.request.target_consumption}</strong>
                  <span>Patrón</span><strong>{labelize(selectedDemand.architecture.architecture_pattern)}</strong>
                  <span>Decisión</span><strong>{labelize(selectedDemand.decision)}</strong>
                  <span>Actualizado</span><strong>{formatDate(selectedDemand.updated_at)}</strong>
                </div>

                <div className="reviewers">
                  {demandReviewers(selectedDemand).map((reviewer) => (
                    <Pill key={reviewer} tone={reviewer === "Data Architect" ? "risk" : "neutral"}>{reviewer}</Pill>
                  ))}
                </div>

                <div className="action-row">
                  <button
                    className="secondary-button ok-action"
                    disabled={actionLoading}
                    onClick={() => void updateDemandStatus("approved_for_scoring", "approved_for_scoring", "Validación final aprobada. La solicitud puede pasar a scoring.")}
                  >
                    Aprobar a scoring
                  </button>
                  <button
                    className="secondary-button warn-action"
                    disabled={actionLoading}
                    onClick={() => void updateDemandStatus("reformulation_required", "reformulation_required", "Se requiere reformulación antes de continuar.")}
                  >
                    Reformular
                  </button>
                  <button
                    className="secondary-button risk-action"
                    disabled={actionLoading}
                    onClick={() => void updateDemandStatus("rejected", "rejected", "Solicitud rechazada después de revisión del Arquitecto de Datos.")}
                  >
                    Rechazar
                  </button>
                </div>

                <div className="timeline">
                  <h4>Trazabilidad</h4>
                  {selectedDemand.events.slice(-5).reverse().map((event) => (
                    <div className="timeline-event" key={event.event_id ?? `${event.timestamp}-${event.type}`}>
                      <strong>{labelize(event.type)}</strong>
                      <span>{formatDate(event.timestamp)} · {event.actor}</span>
                      <p>{event.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-detail">Selecciona una solicitud para revisar trazabilidad y acciones de comité.</div>
            )}
          </aside>
        </div>
      </section>

      <section className="architecture-card card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow small">Paso 4</p>
            <h2>Arquitectura end-to-end validada</h2>
          </div>
          <Pill tone={result.architecture.is_compliant ? "ok" : "warn"}>
            {result.architecture.is_compliant ? "Cumple" : "Con brechas"}
          </Pill>
        </div>
        <div className="architecture-flow">
          {architectureFlow.map((stage) => (
            <div className={`stage stage-${stageStatus[stage]}`} key={stage}>
              <span>{stage}</span>
            </div>
          ))}
        </div>
        <p className="note">
          El agente valida contra una arquitectura predefinida por el Arquitecto de Datos. Si aparece un componente no canónico o una capa crítica faltante, deriva a revisión del Comité Operativo.
        </p>
      </section>

      <section className="gaps-grid">
        <GapList title="Brechas de política" items={result.policy_gaps} tone="warn" />
        <GapList title="Brechas de arquitectura" items={result.architecture.architecture_gaps} tone="risk" />
        <GapList title="Brechas FinOps" items={result.finops_gaps} tone="warn" />
      </section>
    </main>
  );
}
