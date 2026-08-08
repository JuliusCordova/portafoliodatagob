"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

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
type Experience = "intake" | "committee" | "dashboard";
type PriorityLabel = "Alta" | "Media" | "Baja";
type PillTone = "neutral" | "ok" | "warn" | "risk" | "dark";

const benchmarkScore = 4.0;

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

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function compactLabel(value: string | undefined | null, maxLength = 62) {
  const label = labelize(value);
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label;
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

function committeeReviewers(demand: DemandRecord): string[] {
  return demand.committee.required_reviewers ?? demand.committee.required_review_roles ?? [];
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function ScoreChip({ score }: { score: number }) {
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
  const [activeExperience, setActiveExperience] = useState<Experience>("intake");
  const [title, setTitle] = useState("Validación de calidad de clientes para dashboard ejecutivo");
  const [description, setDescription] = useState(
    "Necesitamos integrar datos de clientes desde fuentes operacionales, llevarlos a Bronze, Silver y Gold, crear controles de calidad y publicar un dashboard ejecutivo. Aún no se ha definido cuadratura, modelo semántico ni presupuesto."
  );
  const [targetConsumption, setTargetConsumption] = useState("BI ejecutivo / dashboard");
  const [result, setResult] = useState<ValidationResult>(defaultResult);
  const [persistedDemand, setPersistedDemand] = useState<DemandRecord | null>(null);
  const [backlog, setBacklog] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  const [mode, setMode] = useState<RuntimeMode>("demo");
  const [connectionMessage, setConnectionMessage] = useState("Listo para registrar una nueva solicitud.");
  const [backlogMessage, setBacklogMessage] = useState("Backlog pendiente de sincronización.");
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
    const scores = backlog.map((item) => scoreFromReadiness(readinessFromDemand(item)));
    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const highPriority = backlog.filter((item) => priorityFromDemand(item) === "Alta").length;
    const mediumPriority = backlog.filter((item) => priorityFromDemand(item) === "Media").length;
    const lowPriority = backlog.filter((item) => priorityFromDemand(item) === "Baja").length;
    const inReview = backlog.filter((item) => item.status.includes("review")).length;
    const approved = backlog.filter((item) => item.status.includes("approved")).length;
    const events = backlog.reduce((sum, item) => sum + item.events.length, 0);
    const policyGaps = backlog.reduce((sum, item) => sum + item.policy_gaps.length, 0);
    const architectureGaps = backlog.reduce((sum, item) => sum + item.architecture_gaps.length, 0);
    const finopsGaps = backlog.reduce((sum, item) => sum + item.finops_gaps.length, 0);

    return {
      total: backlog.length,
      averageScore,
      highPriority,
      mediumPriority,
      lowPriority,
      inReview,
      approved,
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
      setConnectionMessage("Validando políticas, arquitectura y guardando la solicitud...");
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
      setConnectionMessage(`Solicitud ${payload.demand.demand_id} registrada y enviada a ${labelize(payload.demand.current_stage)}.`);
      setResult(payload.validation);
      await loadBacklog(payload.demand.demand_id);
      setActiveExperience("committee");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al conectar con el API.";
      setMode("error");
      setConnectionMessage(`No se pudo registrar la solicitud: ${message}`);
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
    <main className="executive-shell">
      <section className="product-hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 08</p>
          <h1>Gobierno de demanda con experiencias separadas por rol</h1>
          <p className="hero-copy">
            Un flujo claro: negocio registra la solicitud, el Comité Operativo analiza y decide, y los comités ejecutivos revisan priorización, valor y trazabilidad del portafolio.
          </p>
        </div>
        <div className="hero-badge">
          <span>Modo</span>
          <strong>{mode === "loading" ? "Sincronizando" : mode === "api" ? "API conectada" : mode === "error" ? "Error" : "Listo"}</strong>
        </div>
      </section>

      <nav className="experience-nav" aria-label="Experiencias ATLAS DataGob">
        <button className={activeExperience === "intake" ? "experience-tab active" : "experience-tab"} onClick={() => setActiveExperience("intake")}>
          <span>01</span>
          <strong>Intake negocio</strong>
          <small>Formulario simple para usuarios de negocio</small>
        </button>
        <button className={activeExperience === "committee" ? "experience-tab active" : "experience-tab"} onClick={() => setActiveExperience("committee")}>
          <span>02</span>
          <strong>Comité operativo</strong>
          <small>Cola, brechas, decisión y trazabilidad</small>
        </button>
        <button className={activeExperience === "dashboard" ? "experience-tab active" : "experience-tab"} onClick={() => setActiveExperience("dashboard")}>
          <span>03</span>
          <strong>Tablero ejecutivo</strong>
          <small>Priorización para comités operativo y estratégico</small>
        </button>
      </nav>

      <section className={`status-card status-${mode}`}>
        <strong>Estado del sistema</strong>
        <span>{connectionMessage}</span>
      </section>

      <section className="status-card status-api">
        <strong>Backlog persistente</strong>
        <span>{backlogLoading ? "Sincronizando backlog..." : backlogMessage}</span>
      </section>

      {activeExperience === "intake" ? (
        <section className="experience-layout intake-layout">
          <article className="card intake-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow small">Experiencia 01</p>
                <h2>Nueva solicitud de negocio</h2>
                <p className="muted-copy">Pantalla intencionalmente simple: el usuario de negocio no ve el tablero ni las acciones de comité.</p>
              </div>
              <Pill tone="neutral">Negocio</Pill>
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

            <button className="primary-action" onClick={validateRequest}>Validar y enviar a gobierno</button>
          </article>

          <aside className="card guidance-card">
            <p className="eyebrow small">Qué pasa después</p>
            <h2>Flujo visible para negocio</h2>
            <ol className="workflow-list">
              <li><strong>Registro.</strong> ATLAS captura el requerimiento y lo estructura.</li>
              <li><strong>Validación.</strong> Los agentes revisan política, arquitectura y FinOps.</li>
              <li><strong>Derivación.</strong> La solicitud pasa a Comité Operativo con estado trazable.</li>
            </ol>
            {persistedDemand ? (
              <div className="success-receipt">
                <span>Última solicitud registrada</span>
                <strong>{persistedDemand.demand_id}</strong>
                <small>{labelize(persistedDemand.status)} · {labelize(persistedDemand.decision)}</small>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}

      {activeExperience === "committee" ? (
        <section className="experience-layout committee-layout">
          <article className="card backlog-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow small">Experiencia 02</p>
                <h2>Cola del Comité Operativo</h2>
                <p className="muted-copy">Diseñada para análisis, no para reporting: muestra solo lo necesario para tomar acción.</p>
              </div>
              <button className="secondary-action" onClick={() => void loadBacklog()}>{backlogLoading ? "Sincronizando" : "Actualizar"}</button>
            </div>

            {backlog.length ? (
              <div className="committee-list">
                {backlog.map((demand) => {
                  const score = scoreFromReadiness(readinessFromDemand(demand));
                  const priority = priorityFromDemand(demand);
                  return (
                    <button
                      className={selectedDemand?.demand_id === demand.demand_id ? "queue-item active" : "queue-item"}
                      key={demand.demand_id}
                      onClick={() => setSelectedDemandId(demand.demand_id)}
                    >
                      <span className="queue-id">{demand.demand_id}</span>
                      <strong>{demand.request.title}</strong>
                      <small>{labelize(demand.architecture.architecture_pattern)} · {demandGapCount(demand)} brechas</small>
                      <div className="queue-meta">
                        <ScoreChip score={score} />
                        <Pill tone={priorityTone(priority)}>{priority}</Pill>
                        <Pill tone={statusTone(demand.status)}>{compactLabel(demand.status, 28)}</Pill>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Sin solicitudes en cola" copy="Cuando negocio registre solicitudes, aparecerán aquí para revisión operativa." />
            )}
          </article>

          <article className="card detail-card">
            {selectedDemand ? (
              <>
                <div className="section-title-row">
                  <div>
                    <p className="eyebrow small">Detalle gobernado</p>
                    <h2>{selectedDemand.demand_id}</h2>
                    <p className="muted-copy">{selectedDemand.request.title}</p>
                  </div>
                  <Pill tone={statusTone(selectedDemand.status)}>{labelize(selectedDemand.status)}</Pill>
                </div>

                <div className="decision-grid">
                  <div><span>Decisión sugerida</span><strong>{labelize(selectedDemand.decision)}</strong></div>
                  <div><span>Patrón</span><strong>{labelize(selectedDemand.architecture.architecture_pattern)}</strong></div>
                  <div><span>Brechas</span><strong>{demandGapCount(selectedDemand)}</strong></div>
                  <div><span>Etapa</span><strong>{compactLabel(selectedDemand.current_stage, 36)}</strong></div>
                </div>

                <div className="committee-box">
                  <h3>Ruta de comité</h3>
                  <p>{selectedDemand.committee_summary}</p>
                  <div className="reviewers">
                    {committeeReviewers(selectedDemand).map((reviewer) => (
                      <Pill key={reviewer} tone={reviewer === "Data Architect" ? "risk" : "neutral"}>{reviewer}</Pill>
                    ))}
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="approve-action"
                    disabled={actionLoading}
                    onClick={() => void updateDemandStatus("approved_for_scoring", "approved_for_scoring", "Aprobado por Arquitecto de Datos para pasar a scoring.")}
                  >
                    Aprobar a scoring
                  </button>
                  <button
                    className="secondary-action"
                    disabled={actionLoading}
                    onClick={() => void updateDemandStatus("reformulation_required", "reformulation_required", "Se requiere reformulación antes de continuar.")}
                  >
                    Solicitar reformulación
                  </button>
                  <button
                    className="danger-action"
                    disabled={actionLoading}
                    onClick={() => void updateDemandStatus("rejected", "rejected", "Rechazado luego de validación final del Arquitecto de Datos.")}
                  >
                    Rechazar
                  </button>
                </div>

                <div className="timeline">
                  <h3>Timeline auditable</h3>
                  {selectedDemand.events.map((event) => (
                    <div className="timeline-event" key={event.event_id ?? `${event.timestamp}-${event.type}`}>
                      <span>{formatDate(event.timestamp)}</span>
                      <strong>{labelize(event.type)}</strong>
                      <p>{event.comment}</p>
                      <small>{event.actor} · {labelize(event.to_status)}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Selecciona una solicitud" copy="El detalle mostrará brechas, decisión, comité, acciones y trazabilidad." />
            )}
          </article>
        </section>
      ) : null}

      {activeExperience === "dashboard" ? (
        <section className="dashboard-experience">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow small">Experiencia 03</p>
              <h2>Tablero Ejecutivo de Priorización</h2>
              <p className="muted-copy">Inspirado en la hoja Tablero: KPIs, Top 5, distribución, benchmark, brechas y preparación financiera sin saturar el intake.</p>
            </div>
            <Pill tone="dark">Comité Operativo + Comité Estratégico</Pill>
          </div>

          <section className="kpi-ribbon">
            <article className="kpi-card dark"><span>Score promedio</span><strong>{portfolioMetrics.averageScore ? portfolioMetrics.averageScore.toFixed(2) : "—"}</strong><small>de 5.00 puntos</small></article>
            <article className="kpi-card"><span>Alta prioridad</span><strong>{portfolioMetrics.highPriority}</strong><small>casos priorizados</small></article>
            <article className="kpi-card"><span>VAN priorizado</span><strong>Preparado</strong><small>Sprint 09: modelo financiero</small></article>
            <article className="kpi-card"><span>Solicitudes</span><strong>{portfolioMetrics.total}</strong><small>backlog persistente</small></article>
            <article className="kpi-card"><span>En revisión</span><strong>{portfolioMetrics.inReview}</strong><small>comité / arquitectura</small></article>
            <article className="kpi-card"><span>Eventos</span><strong>{portfolioMetrics.events}</strong><small>trazabilidad</small></article>
          </section>

          <section className="executive-grid">
            <article className="card board-card top-cases-card">
              <div className="section-title-row">
                <div>
                  <h3>Top 5 casos prioritarios</h3>
                  <p className="muted-copy">Ranking temporal por score operativo. El score financiero formal se incorpora en Sprint 09.</p>
                </div>
              </div>
              {executiveCases.length ? (
                <div className="top-table">
                  <div className="table-row header"><span>#</span><span>Solicitud</span><span>Score</span><span>Prioridad</span><span>Estado</span></div>
                  {executiveCases.map((demand, index) => {
                    const score = scoreFromReadiness(readinessFromDemand(demand));
                    const priority = priorityFromDemand(demand);
                    return (
                      <button className="table-row interactive" key={demand.demand_id} onClick={() => { setSelectedDemandId(demand.demand_id); setActiveExperience("committee"); }}>
                        <span>{index + 1}</span>
                        <span><strong>{compactLabel(demand.request.title, 46)}</strong><small>{demand.demand_id}</small></span>
                        <span><ScoreChip score={score} /></span>
                        <span><Pill tone={priorityTone(priority)}>{priority}</Pill></span>
                        <span><Pill tone={statusTone(demand.status)}>{compactLabel(demand.status, 24)}</Pill></span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Sin casos priorizados" copy="Registra solicitudes desde Intake para poblar el tablero ejecutivo." />
              )}
            </article>

            <article className="card board-card distribution-card">
              <h3>Distribución por prioridad</h3>
              <div className="bar-list">
                {priorityDistribution.map((item) => {
                  const pct = percentage(item.value, Math.max(1, portfolioMetrics.total));
                  return (
                    <div className="bar-item" key={item.label}>
                      <div><Pill tone={item.tone}>{item.label}</Pill><strong>{item.value}</strong></div>
                      <span className="bar-track"><span style={{ width: `${pct}%` }} /></span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="card board-card benchmark-card">
              <h3>Score vs benchmark 4.0</h3>
              <div className="benchmark-list">
                {executiveCases.length ? executiveCases.map((demand) => {
                  const score = scoreFromReadiness(readinessFromDemand(demand));
                  const pct = Math.min(100, Math.round((score / 5) * 100));
                  return (
                    <div className="benchmark-item" key={demand.demand_id}>
                      <div><strong>{compactLabel(demand.request.title, 34)}</strong><span>{(score - benchmarkScore).toFixed(2)} gap</span></div>
                      <span className="bar-track benchmark"><span style={{ width: `${pct}%` }} /></span>
                    </div>
                  );
                }) : <EmptyState title="Benchmark pendiente" copy="El comparativo se activa con solicitudes persistidas." />}
              </div>
            </article>

            <article className="card board-card finance-card">
              <h3>Métricas financieras clave</h3>
              <div className="finance-placeholder">
                <div><span>VAN Total</span><strong>—</strong></div>
                <div><span>TIR Máxima</span><strong>—</strong></div>
                <div><span>Payback Prom.</span><strong>—</strong></div>
                <div><span>ROI Prom.</span><strong>—</strong></div>
              </div>
              <p className="muted-copy">No se inventan valores financieros. El Sprint 09 agregará captura, cálculo y ranking por VAN, TIR, ROI y payback.</p>
            </article>

            <article className="card board-card gaps-card">
              <h3>Brechas agregadas</h3>
              <div className="gap-summary">
                {gapDistribution.map((item) => (
                  <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
                ))}
              </div>
            </article>
          </section>
        </section>
      ) : null}
    </main>
  );
}
