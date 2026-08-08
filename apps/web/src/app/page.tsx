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
type ActiveView = "intake" | "committee" | "executive";
type PillTone = "neutral" | "ok" | "warn" | "risk" | "dark";
type PriorityLabel = "Alta" | "Media" | "Baja";

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
    required_reviewers: ["Data Architect", "Data Owner", "Data Steward"],
    suggested_decision: "architect_review",
    data_architect_final_validation_required: true
  },
  committee_summary:
    "La solicitud fue estructurada por el intake multiagente. Presenta brechas de arquitectura, gobierno y FinOps que deben ser revisadas en Comité Operativo con validación final del Arquitecto de Datos."
};

const viewCopy: Record<ActiveView, { eyebrow: string; title: string; copy: string }> = {
  intake: {
    eyebrow: "Vista 1 · Usuario de negocio",
    title: "Intake simple de solicitud",
    copy: "Captura lo mínimo necesario, valida con agentes y envía la demanda al backlog gobernado. Sin ruido de comité ni tablero."
  },
  committee: {
    eyebrow: "Vista 2 · Comité operativo",
    title: "Cola de análisis y decisión",
    copy: "Revisa solicitudes, brechas, ruta de comité, roles requeridos y cambia estado dejando evidencia trazable."
  },
  executive: {
    eyebrow: "Vista 3 · Comité estratégico",
    title: "Tablero ejecutivo de priorización",
    copy: "Observa el portafolio de demanda: KPIs, Top 5, prioridad, benchmark, brechas agregadas y zona financiera preparada."
  }
};

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function KpiCard({ label, value, helper, tone = "neutral" }: { label: string; value: ReactNode; helper: string; tone?: PillTone }) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function compact(value: string | undefined | null, size = 64) {
  const text = labelize(value);
  return text.length > size ? `${text.slice(0, size)}…` : text;
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

function gapCount(demand: DemandRecord) {
  return demand.policy_gaps.length + demand.architecture_gaps.length + demand.finops_gaps.length;
}

function readinessFromDemand(demand: DemandRecord) {
  return Math.max(25, 100 - gapCount(demand) * 12);
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

function priorityTone(priority: PriorityLabel): PillTone {
  if (priority === "Alta") return "risk";
  if (priority === "Media") return "warn";
  return "neutral";
}

function committeeReviewers(demand: DemandRecord): string[] {
  return demand.committee.required_reviewers ?? demand.committee.required_review_roles ?? [];
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
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
  const [activeView, setActiveView] = useState<ActiveView>("intake");
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
  const [connectionMessage, setConnectionMessage] = useState("Esperando validación del requerimiento.");
  const [backlogMessage, setBacklogMessage] = useState("Backlog pendiente de sincronización.");
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedDemand = useMemo(() => backlog.find((item) => item.demand_id === selectedDemandId) ?? persistedDemand, [backlog, persistedDemand, selectedDemandId]);

  const metrics = useMemo(() => {
    const total = backlog.length;
    const scores = backlog.map((item) => scoreFromReadiness(readinessFromDemand(item)));
    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const high = backlog.filter((item) => priorityFromDemand(item) === "Alta").length;
    const medium = backlog.filter((item) => priorityFromDemand(item) === "Media").length;
    const low = backlog.filter((item) => priorityFromDemand(item) === "Baja").length;
    const review = backlog.filter((item) => item.status.includes("review")).length;
    const approved = backlog.filter((item) => item.status.includes("approved")).length;
    const events = backlog.reduce((sum, item) => sum + item.events.length, 0);
    const policyGaps = backlog.reduce((sum, item) => sum + item.policy_gaps.length, 0);
    const architectureGaps = backlog.reduce((sum, item) => sum + item.architecture_gaps.length, 0);
    const finopsGaps = backlog.reduce((sum, item) => sum + item.finops_gaps.length, 0);

    return { total, averageScore, high, medium, low, review, approved, events, policyGaps, architectureGaps, finopsGaps };
  }, [backlog]);

  const topCases = useMemo(() => {
    return [...backlog]
      .sort((left, right) => scoreFromReadiness(readinessFromDemand(right)) - scoreFromReadiness(readinessFromDemand(left)))
      .slice(0, 5);
  }, [backlog]);

  const intakeReadiness = useMemo(() => {
    const gaps = result.policy_gaps.length + result.finops_gaps.length + result.architecture.architecture_gaps.length;
    return Math.max(25, 100 - gaps * 12);
  }, [result]);

  async function loadBacklog(highlightDemandId?: string) {
    try {
      setBacklogLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Backlog failed with HTTP ${response.status}: ${responseText}`);
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
      setConnectionMessage("Validando y registrando solicitud en backlog gobernado...");
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
      if (!response.ok) throw new Error(`Proxy/API validation failed with HTTP ${response.status}: ${responseText}`);
      const payload = JSON.parse(responseText) as PersistedValidationResponse;
      setMode("api");
      setResult(payload.validation);
      setPersistedDemand(payload.demand);
      setSelectedDemandId(payload.demand.demand_id);
      setConnectionMessage(`Solicitud ${payload.demand.demand_id} enviada al Comité Operativo.`);
      await loadBacklog(payload.demand.demand_id);
      setActiveView("committee");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al conectar con el API.";
      setMode("error");
      setConnectionMessage(`No se pudo conectar con el API: ${message}`);
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
        body: JSON.stringify({ demand_id: selectedDemand.demand_id, status, decision, actor: "Data Architect", comment })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Status update failed with HTTP ${response.status}: ${responseText}`);
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
    <main className="app-shell">
      <section className="app-hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 08</p>
          <h1>{viewCopy[activeView].title}</h1>
          <p className="hero-copy">{viewCopy[activeView].copy}</p>
        </div>
        <aside className="hero-panel">
          <span>Modo</span>
          <strong>{mode === "api" ? "API conectada" : mode === "loading" ? "Procesando" : mode === "error" ? "Error" : "Demo local"}</strong>
          <button className="ghost-button" onClick={() => void loadBacklog()}>{backlogLoading ? "Actualizando..." : "Actualizar backlog"}</button>
        </aside>
      </section>

      <nav className="experience-nav" aria-label="Navegación por experiencia">
        <button className={activeView === "intake" ? "active" : ""} onClick={() => setActiveView("intake")}>1 · Intake negocio</button>
        <button className={activeView === "committee" ? "active" : ""} onClick={() => setActiveView("committee")}>2 · Comité operativo</button>
        <button className={activeView === "executive" ? "active" : ""} onClick={() => setActiveView("executive")}>3 · Tablero ejecutivo</button>
      </nav>

      <section className={`status-strip status-${mode}`}>
        <strong>Estado</strong>
        <span>{connectionMessage}</span>
      </section>
      <section className="status-strip status-api">
        <strong>Backlog</strong>
        <span>{backlogMessage}</span>
      </section>

      {activeView === "intake" ? (
        <section className="view-grid intake-view">
          <article className="card focus-card">
            <div className="section-header">
              <div>
                <p className="eyebrow small">Solicitud de negocio</p>
                <h2>Cuéntanos qué necesitas</h2>
              </div>
              <Pill>Intake agent</Pill>
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
            <button onClick={validateRequest}>{mode === "loading" ? "Validando..." : "Validar y enviar a comité"}</button>
          </article>

          <aside className="card guidance-card">
            <p className="eyebrow small">Qué sucede después</p>
            <h2>Ruta clara, sin saturar al usuario</h2>
            <div className="workflow-steps">
              <div><span>1</span><strong>Registro</strong><p>Negocio ingresa la necesidad con lenguaje simple.</p></div>
              <div><span>2</span><strong>Validación agéntica</strong><p>ATLAS clasifica, revisa políticas, arquitectura y FinOps.</p></div>
              <div><span>3</span><strong>Comité operativo</strong><p>La solicitud pasa a revisión con evidencia trazable.</p></div>
            </div>
            {persistedDemand ? (
              <div className="success-panel">
                <strong>{persistedDemand.demand_id}</strong>
                <p>Solicitud enviada al Comité Operativo.</p>
              </div>
            ) : (
              <div className="mini-metrics">
                <KpiCard label="Readiness estimado" value={`${intakeReadiness}%`} helper="prevalidación" />
                <KpiCard label="Patrón inicial" value={result.architecture.architecture_pattern} helper="arquitectura" />
              </div>
            )}
          </aside>
        </section>
      ) : null}

      {activeView === "committee" ? (
        <section className="view-grid committee-view">
          <article className="card queue-card">
            <div className="section-header">
              <div>
                <p className="eyebrow small">Cola operativa</p>
                <h2>Solicitudes para revisión</h2>
              </div>
              <Pill tone="warn">{metrics.review} en revisión</Pill>
            </div>
            {backlog.length ? (
              <div className="queue-list">
                {backlog.map((demand) => {
                  const score = scoreFromReadiness(readinessFromDemand(demand));
                  const priority = priorityFromDemand(demand);
                  return (
                    <button key={demand.demand_id} className={`queue-item ${selectedDemand?.demand_id === demand.demand_id ? "selected" : ""}`} onClick={() => setSelectedDemandId(demand.demand_id)}>
                      <span>{demand.demand_id}</span>
                      <strong>{demand.request.title}</strong>
                      <small>{demand.request.requester_area} · {compact(demand.architecture.architecture_pattern, 30)}</small>
                      <div>
                        <Pill tone={priorityTone(priority)}>{priority}</Pill>
                        <Pill tone={statusTone(demand.status)}>{compact(demand.status, 32)}</Pill>
                        <b>{score.toFixed(2)}/5</b>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No hay solicitudes todavía" copy="Registra una solicitud desde Intake negocio para alimentar la cola del comité." />
            )}
          </article>

          <article className="card detail-card">
            {selectedDemand ? (
              <>
                <div className="section-header">
                  <div>
                    <p className="eyebrow small">Detalle gobernado</p>
                    <h2>{selectedDemand.demand_id}</h2>
                  </div>
                  <Pill tone={statusTone(selectedDemand.status)}>{compact(selectedDemand.status, 32)}</Pill>
                </div>
                <div className="detail-grid">
                  <div><span>Caso</span><strong>{selectedDemand.request.title}</strong></div>
                  <div><span>Área</span><strong>{selectedDemand.request.requester_area}</strong></div>
                  <div><span>Consumo</span><strong>{selectedDemand.request.target_consumption ?? "No definido"}</strong></div>
                  <div><span>Patrón</span><strong>{selectedDemand.architecture.architecture_pattern}</strong></div>
                  <div><span>Brechas</span><strong>{gapCount(selectedDemand)}</strong></div>
                  <div><span>Decisión</span><strong>{compact(selectedDemand.decision, 42)}</strong></div>
                </div>
                <div className="reviewer-row">
                  {committeeReviewers(selectedDemand).map((reviewer) => <Pill key={reviewer}>{reviewer}</Pill>)}
                </div>
                <p className="muted-copy">{selectedDemand.committee_summary}</p>
                <div className="actions-row">
                  <button className="ok-action" disabled={actionLoading} onClick={() => void updateDemandStatus("approved_for_scoring", "approved_for_scoring", "Comité Operativo aprueba el pase a scoring.")}>Aprobar a scoring</button>
                  <button className="neutral-action" disabled={actionLoading} onClick={() => void updateDemandStatus("reformulation_required", "reformulation_required", "Comité solicita reformulación antes de continuar.")}>Reformular</button>
                  <button className="risk-action" disabled={actionLoading} onClick={() => void updateDemandStatus("rejected", "rejected", "Comité rechaza la solicitud por brechas críticas.")}>Rechazar</button>
                </div>
                <div className="timeline">
                  <h3>Timeline de trazabilidad</h3>
                  {selectedDemand.events.map((event) => (
                    <div className="timeline-item" key={event.event_id ?? `${event.timestamp}-${event.type}`}>
                      <span>{formatDate(event.timestamp)}</span>
                      <strong>{labelize(event.type)} · {event.actor}</strong>
                      <p>{event.comment}</p>
                      <small>{labelize(event.from_status)} → {labelize(event.to_status)}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Selecciona una solicitud" copy="El detalle operativo aparecerá aquí con brechas, roles, decisión y timeline." />
            )}
          </article>
        </section>
      ) : null}

      {activeView === "executive" ? (
        <section className="executive-view">
          <section className="kpi-grid">
            <KpiCard label="Score promedio" value={metrics.averageScore ? metrics.averageScore.toFixed(2) : "—"} helper="de 5.00 puntos" tone="dark" />
            <KpiCard label="Alta prioridad" value={metrics.high} helper="casos prioritarios" tone="risk" />
            <KpiCard label="VAN total" value="Sprint 09" helper="modelo financiero" />
            <KpiCard label="Solicitudes" value={metrics.total} helper="demanda registrada" />
            <KpiCard label="En revisión" value={metrics.review} helper="comité / arquitectura" tone="warn" />
            <KpiCard label="Eventos" value={metrics.events} helper="evidencia trazable" />
          </section>

          <section className="dashboard-grid">
            <article className="card wide-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow small">Top casos prioritarios</p>
                  <h2>Portafolio gobernado</h2>
                </div>
                <Pill tone="dark">Benchmark 4.0</Pill>
              </div>
              {topCases.length ? (
                <table className="executive-table">
                  <thead><tr><th>#</th><th>Área</th><th>Caso</th><th>Score</th><th>Prioridad</th><th>Estado</th><th>Decisión</th></tr></thead>
                  <tbody>
                    {topCases.map((demand, index) => {
                      const score = scoreFromReadiness(readinessFromDemand(demand));
                      const priority = priorityFromDemand(demand);
                      return (
                        <tr key={demand.demand_id} onClick={() => { setSelectedDemandId(demand.demand_id); setActiveView("committee"); }}>
                          <td>{index + 1}</td>
                          <td>{demand.request.requester_area}</td>
                          <td><strong>{compact(demand.request.title, 48)}</strong><small>{demand.demand_id}</small></td>
                          <td><b>{score.toFixed(2)}</b>/5</td>
                          <td><Pill tone={priorityTone(priority)}>{priority}</Pill></td>
                          <td><Pill tone={statusTone(demand.status)}>{compact(demand.status, 30)}</Pill></td>
                          <td>{compact(demand.decision, 38)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Sin portafolio todavía" copy="Registra solicitudes desde Intake para construir el tablero ejecutivo." />
              )}
            </article>

            <article className="card">
              <p className="eyebrow small">Distribución</p>
              <h2>Prioridad</h2>
              {[{ label: "Alta", value: metrics.high }, { label: "Media", value: metrics.medium }, { label: "Baja", value: metrics.low }].map((item) => (
                <div className="bar-row" key={item.label}>
                  <span>{item.label}</span><strong>{item.value}</strong>
                  <div><i style={{ width: `${percentage(item.value, metrics.total)}%` }} /></div>
                  <small>{percentage(item.value, metrics.total)}% del backlog</small>
                </div>
              ))}
            </article>

            <article className="card">
              <p className="eyebrow small">Finanzas</p>
              <h2>Métricas clave</h2>
              <div className="finance-list">
                <div><span>VAN total</span><strong>Pendiente</strong></div>
                <div><span>TIR máxima</span><strong>Pendiente</strong></div>
                <div><span>Payback prom.</span><strong>Pendiente</strong></div>
                <div><span>ROI promedio</span><strong>Pendiente</strong></div>
              </div>
              <p className="muted-copy">Zona preparada para el modelo financiero del Sprint 09.</p>
            </article>

            <article className="card wide-card">
              <p className="eyebrow small">Análisis comparativo</p>
              <h2>Score vs benchmark 4.0</h2>
              {topCases.length ? topCases.map((demand) => {
                const score = scoreFromReadiness(readinessFromDemand(demand));
                return (
                  <div className="benchmark-row" key={demand.demand_id}>
                    <span>{compact(demand.request.title, 42)}</span>
                    <div><i style={{ width: `${Math.min(100, (score / 5) * 100)}%` }} /></div>
                    <strong>{score.toFixed(2)}/5</strong>
                    <small>Gap {(score - benchmarkScore).toFixed(2)}</small>
                  </div>
                );
              }) : <EmptyState title="Sin benchmark" copy="El comparativo aparecerá cuando existan solicitudes registradas." />}
            </article>

            <article className="card">
              <p className="eyebrow small">Brechas</p>
              <h2>Política · Arquitectura · FinOps</h2>
              {[{ label: "Política", value: metrics.policyGaps }, { label: "Arquitectura", value: metrics.architectureGaps }, { label: "FinOps", value: metrics.finopsGaps }].map((item) => (
                <div className="bar-row" key={item.label}>
                  <span>{item.label}</span><strong>{item.value}</strong>
                  <div><i style={{ width: `${Math.min(100, item.value * 20)}%` }} /></div>
                </div>
              ))}
            </article>
          </section>
        </section>
      ) : null}
    </main>
  );
}
