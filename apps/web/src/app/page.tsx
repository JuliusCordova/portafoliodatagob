"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

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
type PriorityLabel = "Alta" | "Media" | "Baja";
type PillTone = "neutral" | "ok" | "warn" | "risk" | "dark";

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

const benchmarkScore = 4.0;

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function compactLabel(value: string | undefined | null) {
  const label = labelize(value);
  return label.length > 54 ? `${label.slice(0, 54)}…` : label;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusTone(status: string): PillTone {
  if (status.includes("approved")) return "ok";
  if (status.includes("rejected")) return "risk";
  if (status.includes("reformulation") || status.includes("review")) return "warn";
  return "neutral";
}

function priorityTone(priority: PriorityLabel): PillTone {
  if (priority === "Alta") return "risk";
  if (priority === "Media") return "warn";
  return "neutral";
}

function demandReviewers(demand: DemandRecord): string[] {
  return demand.committee.required_reviewers ?? demand.committee.required_review_roles ?? [];
}

function demandGapCount(demand: DemandRecord) {
  return demand.policy_gaps.length + demand.architecture_gaps.length + demand.finops_gaps.length;
}

function readinessFromDemand(demand: DemandRecord) {
  return Math.max(25, 100 - demandGapCount(demand) * 12);
}

function scoreFromReadiness(readiness: number) {
  return Math.max(1, Math.min(5, readiness / 20));
}

function priorityFromDemand(demand: DemandRecord): PriorityLabel {
  if (demand.status.includes("approved")) return "Alta";
  const score = scoreFromReadiness(readinessFromDemand(demand));
  if (score >= 4) return "Alta";
  if (score >= 3) return "Media";
  return "Baja";
}

function gapTone(count: number): PillTone {
  if (count >= 5) return "risk";
  if (count >= 2) return "warn";
  return "ok";
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function AvgScore({ score }: { score: number }) {
  return (
    <span className="score-chip">
      {score.toFixed(2)}<small>/5</small>
    </span>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
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

  const selectedDemand = useMemo(() => {
    return backlog.find((item) => item.demand_id === selectedDemandId) ?? persistedDemand;
  }, [backlog, persistedDemand, selectedDemandId]);

  const executiveCases = useMemo(() => {
    return [...backlog]
      .sort((left, right) => scoreFromReadiness(readinessFromDemand(right)) - scoreFromReadiness(readinessFromDemand(left)))
      .slice(0, 5);
  }, [backlog]);

  const portfolioMetrics = useMemo(() => {
    const total = backlog.length;
    const scores = backlog.map((item) => scoreFromReadiness(readinessFromDemand(item)));
    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : scoreFromReadiness(76);
    const highPriority = backlog.filter((item) => priorityFromDemand(item) === "Alta").length;
    const mediumPriority = backlog.filter((item) => priorityFromDemand(item) === "Media").length;
    const lowPriority = backlog.filter((item) => priorityFromDemand(item) === "Baja").length;
    const inReview = backlog.filter((item) => item.status.includes("review")).length;
    const approved = backlog.filter((item) => item.status.includes("approved")).length;
    const reformulation = backlog.filter((item) => item.status.includes("reformulation")).length;
    const rejected = backlog.filter((item) => item.status.includes("rejected")).length;
    const events = backlog.reduce((sum, item) => sum + item.events.length, 0);
    const policyGaps = backlog.reduce((sum, item) => sum + item.policy_gaps.length, 0);
    const architectureGaps = backlog.reduce((sum, item) => sum + item.architecture_gaps.length, 0);
    const finopsGaps = backlog.reduce((sum, item) => sum + item.finops_gaps.length, 0);

    return {
      total,
      averageScore,
      highPriority,
      mediumPriority,
      lowPriority,
      inReview,
      approved,
      reformulation,
      rejected,
      events,
      policyGaps,
      architectureGaps,
      finopsGaps
    };
  }, [backlog]);

  const readinessScore = useMemo(() => {
    const gaps = result.policy_gaps.length + result.finops_gaps.length + result.architecture.architecture_gaps.length;
    return Math.max(25, 100 - gaps * 12);
  }, [result]);

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

  const priorityDistribution = [
    { label: "Alta", value: portfolioMetrics.highPriority, tone: "risk" as PillTone },
    { label: "Media", value: portfolioMetrics.mediumPriority, tone: "warn" as PillTone },
    { label: "Baja", value: portfolioMetrics.lowPriority, tone: "neutral" as PillTone }
  ];

  const gapDistribution = [
    { label: "Política", value: portfolioMetrics.policyGaps },
    { label: "Arquitectura", value: portfolioMetrics.architectureGaps },
    { label: "FinOps", value: portfolioMetrics.finopsGaps }
  ];

  return (
    <main className="executive-shell">
      <section className="executive-hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 08</p>
          <h1>Dashboard Ejecutivo de Priorización</h1>
          <p className="hero-copy">
            Vista de portafolio para gobernar demanda de datos: prioridad, decisión, brechas, ruta de comité y trazabilidad operativa en una sola pantalla.
          </p>
        </div>
        <div className="hero-stack">
          <div className="hero-badge">
            <span>Modo</span>
            <strong>{mode === "loading" ? "Sincronizando" : mode === "api" ? "API conectada" : mode === "error" ? "Error conexión" : "Demo local"}</strong>
          </div>
          <button className="ghost-button" onClick={() => void loadBacklog()} disabled={backlogLoading}>
            {backlogLoading ? "Actualizando…" : "Actualizar backlog"}
          </button>
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

      <section className="kpi-ribbon">
        <article className="kpi-card primary-kpi">
          <span>▦ Score promedio</span>
          <strong>{portfolioMetrics.averageScore.toFixed(2)}</strong>
          <small>de 5.00 puntos máximo</small>
        </article>
        <article className="kpi-card">
          <span>● Alta prioridad</span>
          <strong>{portfolioMetrics.highPriority}</strong>
          <small>casos prioritarios</small>
        </article>
        <article className="kpi-card">
          <span>$ VAN total</span>
          <strong className="pending-value">Sprint 09</strong>
          <small>valor potencial por modelar</small>
        </article>
        <article className="kpi-card">
          <span>▣ Solicitudes</span>
          <strong>{portfolioMetrics.total}</strong>
          <small>demanda registrada</small>
        </article>
        <article className="kpi-card">
          <span>◐ En revisión</span>
          <strong>{portfolioMetrics.inReview}</strong>
          <small>comité / arquitectura</small>
        </article>
        <article className="kpi-card">
          <span>↗ Eventos</span>
          <strong>{portfolioMetrics.events}</strong>
          <small>evidencia trazable</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="executive-card portfolio-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow small">🏆 Top casos prioritarios</p>
              <h2>Portafolio gobernado</h2>
            </div>
            <Pill tone="dark">Benchmark {benchmarkScore.toFixed(1)}</Pill>
          </div>

          {executiveCases.length ? (
            <div className="portfolio-table-wrap">
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Área</th>
                    <th>Caso de negocio</th>
                    <th>Score</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Decisión</th>
                  </tr>
                </thead>
                <tbody>
                  {executiveCases.map((demand, index) => {
                    const readiness = readinessFromDemand(demand);
                    const score = scoreFromReadiness(readiness);
                    const priority = priorityFromDemand(demand);
                    return (
                      <tr
                        key={demand.demand_id}
                        className={selectedDemand?.demand_id === demand.demand_id ? "selected-row" : ""}
                        onClick={() => setSelectedDemandId(demand.demand_id)}
                      >
                        <td>{index + 1}</td>
                        <td>{demand.request.requester_area}</td>
                        <td>
                          <strong>{demand.request.title}</strong>
                          <small>{demand.demand_id}</small>
                        </td>
                        <td><AvgScore score={score} /></td>
                        <td><Pill tone={priorityTone(priority)}>{priority}</Pill></td>
                        <td><Pill tone={statusTone(demand.status)}>{compactLabel(demand.status)}</Pill></td>
                        <td>{compactLabel(demand.decision)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Aún no hay solicitudes en backlog" copy="Crea una solicitud para que aparezca en el ranking ejecutivo." />
          )}
        </article>

        <article className="executive-card priority-card">
          <div className="card-title-row compact-title">
            <div>
              <p className="eyebrow small">▣ Distribución</p>
              <h2>Prioridad</h2>
            </div>
          </div>
          <div className="distribution-list">
            {priorityDistribution.map((item) => {
              const pct = percentage(item.value, portfolioMetrics.total);
              return (
                <div className="distribution-row" key={item.label}>
                  <div>
                    <Pill tone={item.tone}>{item.label}</Pill>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="bar-track"><span style={{ width: `${pct}%` }} /></div>
                  <small>{pct}% del backlog</small>
                </div>
              );
            })}
          </div>
        </article>

        <article className="executive-card finance-card">
          <div className="card-title-row compact-title">
            <div>
              <p className="eyebrow small">💼 Finanzas</p>
              <h2>Métricas clave</h2>
            </div>
          </div>
          <div className="finance-list">
            <div><span>VAN total</span><strong>Pendiente</strong></div>
            <div><span>TIR máxima</span><strong>Pendiente</strong></div>
            <div><span>Payback prom.</span><strong>Pendiente</strong></div>
            <div><span>ROI promedio</span><strong>Pendiente</strong></div>
          </div>
          <p className="note">El tablero deja preparada la zona financiera; el modelo de VAN, TIR, ROI y payback se agregará en el Sprint 09.</p>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="executive-card comparison-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow small">📈 Análisis comparativo</p>
              <h2>Score vs benchmark 4.0</h2>
            </div>
          </div>
          {executiveCases.length ? (
            <div className="comparison-list">
              {executiveCases.map((demand) => {
                const score = scoreFromReadiness(readinessFromDemand(demand));
                const gap = score - benchmarkScore;
                const width = Math.min(100, Math.round((score / 5) * 100));
                return (
                  <div className="comparison-row" key={demand.demand_id}>
                    <div className="comparison-label">
                      <strong>{demand.request.title}</strong>
                      <span>Gap {gap >= 0 ? "+" : ""}{gap.toFixed(2)}</span>
                    </div>
                    <div className="score-bar"><span style={{ width: `${width}%` }} /></div>
                    <AvgScore score={score} />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Sin datos comparativos" copy="El comparativo se activará cuando existan solicitudes persistidas." />
          )}
        </article>

        <article className="executive-card van-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow small">💰 VAN por caso</p>
              <h2>Potencial económico</h2>
            </div>
          </div>
          <div className="placeholder-chart">
            <span>VAN</span>
            <strong>Modelo financiero pendiente</strong>
            <p>El tablero está diseñado para recibir VAN por iniciativa cuando se active scoring económico.</p>
          </div>
        </article>

        <article className="executive-card gap-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow small">⚠ Brechas</p>
              <h2>Política · Arquitectura · FinOps</h2>
            </div>
          </div>
          <div className="gap-bars">
            {gapDistribution.map((item) => {
              const max = Math.max(1, portfolioMetrics.policyGaps, portfolioMetrics.architectureGaps, portfolioMetrics.finopsGaps);
              return (
                <div className="gap-bar" key={item.label}>
                  <div><span>{item.label}</span><strong>{item.value}</strong></div>
                  <div className="bar-track"><span style={{ width: `${Math.round((item.value / max) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="operations-grid">
        <article className="executive-card intake-panel">
          <div className="card-title-row">
            <div>
              <p className="eyebrow small">Paso 1</p>
              <h2>Nueva solicitud de negocio</h2>
            </div>
            <Pill tone="neutral">Intake agent</Pill>
          </div>

          <label>
            Título del requerimiento
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Descripción
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={7} />
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
            {mode === "loading" ? "Validando y guardando…" : "Validar y guardar solicitud"}
          </button>

          <div className="validation-summary">
            <div><span>Readiness estimado</span><strong>{readinessScore}%</strong></div>
            <div><span>Patrón</span><strong>{result.architecture.architecture_pattern}</strong></div>
            <div><span>Decisión</span><strong>{result.operative_committee.suggested_decision}</strong></div>
          </div>
        </article>

        <article className="executive-card detail-panel">
          <div className="card-title-row">
            <div>
              <p className="eyebrow small">Detalle gobernado</p>
              <h2>{selectedDemand ? selectedDemand.demand_id : "Solicitud no seleccionada"}</h2>
            </div>
            {selectedDemand ? <Pill tone={statusTone(selectedDemand.status)}>{compactLabel(selectedDemand.status)}</Pill> : null}
          </div>

          {selectedDemand ? (
            <>
              <div className="detail-grid">
                <div><span>Caso</span><strong>{selectedDemand.request.title}</strong></div>
                <div><span>Área</span><strong>{selectedDemand.request.requester_area}</strong></div>
                <div><span>Consumo</span><strong>{selectedDemand.request.target_consumption ?? "No definido"}</strong></div>
                <div><span>Patrón</span><strong>{selectedDemand.architecture.architecture_pattern}</strong></div>
                <div><span>Score</span><strong>{scoreFromReadiness(readinessFromDemand(selectedDemand)).toFixed(2)} / 5</strong></div>
                <div><span>Brechas</span><strong>{demandGapCount(selectedDemand)}</strong></div>
              </div>

              <div className="committee-strip">
                <div>
                  <span>Ruta comité</span>
                  <strong>{labelize(selectedDemand.current_stage)}</strong>
                </div>
                <div className="reviewers">
                  {demandReviewers(selectedDemand).map((reviewer) => (
                    <Pill key={reviewer} tone={reviewer === "Data Architect" ? "risk" : "neutral"}>{reviewer}</Pill>
                  ))}
                </div>
              </div>

              <p className="committee-summary">{selectedDemand.committee_summary}</p>

              <div className="action-row">
                <button
                  className="secondary-button"
                  onClick={() => void updateDemandStatus("approved_for_scoring", "approved_for_scoring", "Aprobado por Arquitecto de Datos para pasar a scoring operativo.")}
                  disabled={actionLoading}
                >
                  Aprobar a scoring
                </button>
                <button
                  className="ghost-button"
                  onClick={() => void updateDemandStatus("reformulation_required", "reformulation_required", "Se solicita reformulación para cerrar brechas antes del scoring.")}
                  disabled={actionLoading}
                >
                  Reformular
                </button>
                <button
                  className="danger-button"
                  onClick={() => void updateDemandStatus("rejected", "rejected_after_architect_review", "Rechazado luego de validación final del Arquitecto de Datos.")}
                  disabled={actionLoading}
                >
                  Rechazar
                </button>
              </div>

              <div className="timeline">
                <div className="timeline-title">Timeline de trazabilidad</div>
                {selectedDemand.events.slice().reverse().map((event) => (
                  <div className="timeline-event" key={event.event_id ?? `${event.timestamp}-${event.type}`}>
                    <span>{formatDate(event.timestamp)}</span>
                    <strong>{labelize(event.type)} · {event.actor}</strong>
                    <p>{event.comment}</p>
                    <small>{labelize(event.from_status)} → {labelize(event.to_status)}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="Selecciona una solicitud" copy="Crea o selecciona una demanda para ver su detalle, comité y trazabilidad." />
          )}
        </article>
      </section>

      <section className="executive-card architecture-card">
        <div className="card-title-row">
          <div>
            <p className="eyebrow small">Arquitectura end-to-end</p>
            <h2>Lectura ejecutiva de cumplimiento</h2>
          </div>
          <Pill tone={selectedDemand?.architecture.is_compliant ? "ok" : "warn"}>{selectedDemand?.architecture.is_compliant ? "Cumple" : "Con brechas"}</Pill>
        </div>
        {selectedDemand ? (
          <div className="gaps-grid">
            <div className="gap-box"><span>Política</span><strong>{selectedDemand.policy_gaps.length}</strong><p>{selectedDemand.policy_gaps[0] ?? "Sin brechas"}</p></div>
            <div className="gap-box"><span>Arquitectura</span><strong>{selectedDemand.architecture_gaps.length}</strong><p>{selectedDemand.architecture_gaps[0] ?? "Sin brechas"}</p></div>
            <div className="gap-box"><span>FinOps</span><strong>{selectedDemand.finops_gaps.length}</strong><p>{selectedDemand.finops_gaps[0] ?? "Sin brechas"}</p></div>
          </div>
        ) : (
          <div className="gaps-grid">
            <div className="gap-box"><span>Política</span><strong>{result.policy_gaps.length}</strong><p>{result.policy_gaps[0]}</p></div>
            <div className="gap-box"><span>Arquitectura</span><strong>{result.architecture.architecture_gaps.length}</strong><p>{result.architecture.architecture_gaps[0]}</p></div>
            <div className="gap-box"><span>FinOps</span><strong>{result.finops_gaps.length}</strong><p>{result.finops_gaps[0]}</p></div>
          </div>
        )}
      </section>
    </main>
  );
}
