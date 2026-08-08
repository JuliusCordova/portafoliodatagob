"use client";

import { useEffect, useMemo, useState } from "react";

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
  policy_gaps: string[];
  architecture_gaps: string[];
  finops_gaps: string[];
  committee?: {
    suggested_decision?: string;
    required_reviewers?: string[];
    required_review_roles?: string[];
  };
  committee_inputs?: Record<string, unknown>;
  validation_state?: Record<string, unknown>;
  events: DemandEvent[];
};

type BacklogResponse = { count: number; demands: DemandRecord[] };
type DecisionResponse = { demand: DemandRecord; committee_decision: Record<string, unknown>; message: string };

type DecisionOption = {
  value: string;
  label: string;
  helper: string;
};

const decisionOptions: DecisionOption[] = [
  {
    value: "approved_for_scoring",
    label: "Aprobar para scoring",
    helper: "La demanda queda lista para priorización cuantitativa."
  },
  {
    value: "reformulation_required",
    label: "Solicitar reformulación",
    helper: "La demanda vuelve al solicitante con observaciones claras."
  },
  {
    value: "rejected",
    label: "Rechazar",
    helper: "La demanda se cierra por bajo valor, alto riesgo o falta de alineamiento."
  },
  {
    value: "architecture_exception",
    label: "Registrar excepción arquitectónica",
    helper: "La demanda queda en revisión por excepción o validación del Arquitecto de Datos."
  }
];

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function formatDate(value: string | undefined) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusTone(status: string) {
  if (status.includes("approved") || status.includes("scored")) return "#146c43";
  if (status.includes("rejected")) return "#b42318";
  if (status.includes("review") || status.includes("reformulation")) return "#9a6700";
  return "#475467";
}

function suggestedDecision(demand: DemandRecord | null) {
  return demand?.committee?.suggested_decision ?? String(demand?.committee_inputs?.committee_recommendation ?? "pending_committee_recommendation");
}

function eventPreview(demand: DemandRecord | null) {
  return [...(demand?.events ?? [])].slice(-5).reverse();
}

function hasDecision(demand: DemandRecord) {
  return Boolean(demand.committee_inputs?.committee_final_decision || demand.validation_state?.committee_decision_recorded);
}

export default function CommitteeDecisionPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Carga el backlog para iniciar la sesión de comité.");
  const [finalDecision, setFinalDecision] = useState("approved_for_scoring");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [reason, setReason] = useState("El comité valida valor, viabilidad y control suficiente para continuar.");
  const [conditions, setConditions] = useState("Completar responsables, evidencias y controles antes del siguiente gate.");

  const selectedDemand = useMemo(
    () => demands.find((item) => item.demand_id === selectedDemandId) ?? null,
    [demands, selectedDemandId]
  );

  const reviewQueue = useMemo(
    () => demands.filter((item) => !hasDecision(item) && !["closed", "archived", "rejected"].includes(item.status)),
    [demands]
  );

  const decidedItems = useMemo(() => demands.filter(hasDecision), [demands]);

  async function loadBacklog(highlightId?: string) {
    try {
      setLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as BacklogResponse;
      setDemands(payload.demands);
      const nextSelection = highlightId || selectedDemandId || payload.demands[0]?.demand_id || "";
      setSelectedDemandId(nextSelection);
      setMessage(`Backlog cargado: ${payload.count} demandas. Pendientes de decisión: ${payload.demands.filter((item) => !hasDecision(item)).length}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo cargar el backlog: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBacklog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectDemand(demand: DemandRecord) {
    setSelectedDemandId(demand.demand_id);
    const suggested = demand.committee?.suggested_decision;
    if (suggested === "reformulation_required" || suggested === "rejected" || suggested === "approved_for_scoring") {
      setFinalDecision(suggested);
    } else if (suggested === "architect_review") {
      setFinalDecision("architecture_exception");
    }
    setMessage(`Demanda seleccionada: ${demand.demand_id}`);
  }

  async function submitDecision() {
    if (!selectedDemand) {
      setMessage("Selecciona una demanda antes de registrar decisión.");
      return;
    }
    if (reason.trim().length < 10) {
      setMessage("Agrega una justificación mínima para dejar trazabilidad.");
      return;
    }

    try {
      setSaving(true);
      setMessage("Registrando decisión del Comité Operativo...");
      const response = await fetch("/api/demands/committee-decision", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demand_id: selectedDemand.demand_id,
          recommendation: suggestedDecision(selectedDemand),
          final_decision: finalDecision,
          reason,
          conditions,
          risk_level: riskLevel,
          architecture_exception: finalDecision === "architecture_exception",
          actor: "Comité Operativo"
        })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as DecisionResponse;
      setDemands((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setMessage(`Decisión registrada: ${labelize(String(payload.committee_decision.committee_final_decision))}. Estado: ${labelize(payload.demand.status)}.`);
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo registrar la decisión: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = decisionOptions.find((item) => item.value === finalDecision);

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#667085", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Comité operativo</h1>
            <p style={{ margin: 0, maxWidth: 760, color: "#475467", fontSize: 17 }}>
              Flujo pragmático para registrar decisión final, justificación, condiciones y trazabilidad sin buscar perfección operativa todavía.
            </p>
          </div>
          <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 700 }}>
            {loading ? "Cargando..." : "Sincronizar backlog"}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Backlog</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{demands.length}</strong>
            <small>Solicitudes cargadas</small>
          </article>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Pendientes</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{reviewQueue.length}</strong>
            <small>Sin decisión formal registrada</small>
          </article>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Decididas</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{decidedItems.length}</strong>
            <small>Con trazabilidad de comité</small>
          </article>
        </section>

        <p style={{ padding: 16, borderRadius: 16, background: "#eef4ff", color: "#3538cd", margin: 0, fontWeight: 700 }}>{message}</p>

        <section style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 20, alignItems: "start" }}>
          <aside style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Cola de decisión</h2>
            {demands.length === 0 ? (
              <div style={{ padding: 20, borderRadius: 18, background: "white", border: "1px solid #eaecf0" }}>No hay demandas cargadas.</div>
            ) : (
              demands.map((demand) => (
                <button
                  key={demand.demand_id}
                  onClick={() => selectDemand(demand)}
                  style={{
                    textAlign: "left",
                    padding: 16,
                    borderRadius: 18,
                    background: selectedDemandId === demand.demand_id ? "#111827" : "white",
                    color: selectedDemandId === demand.demand_id ? "white" : "#101828",
                    border: "1px solid #eaecf0",
                    cursor: "pointer"
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 6 }}>{demand.request.title}</strong>
                  <small>{demand.demand_id}</small>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: selectedDemandId === demand.demand_id ? "#d0d5dd" : statusTone(demand.status), fontWeight: 800 }}>{labelize(demand.status)}</span>
                    {hasDecision(demand) ? <span>· decisión registrada</span> : <span>· pendiente</span>}
                  </div>
                </button>
              ))
            )}
          </aside>

          <section style={{ display: "grid", gap: 18 }}>
            <article style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Decisión del comité</h2>
              {!selectedDemand ? (
                <p>Selecciona una demanda para registrar decisión.</p>
              ) : (
                <div style={{ display: "grid", gap: 18 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", color: "#667085", fontWeight: 700 }}>Demanda seleccionada</p>
                    <h3 style={{ margin: 0 }}>{selectedDemand.request.title}</h3>
                    <p style={{ color: "#475467" }}>{selectedDemand.request.description}</p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span><strong>ID:</strong> {selectedDemand.demand_id}</span>
                      <span><strong>Área:</strong> {selectedDemand.request.requester_area}</span>
                      <span><strong>Dominio:</strong> {selectedDemand.request.domain_hint || "No definido"}</span>
                      <span><strong>Estado:</strong> {labelize(selectedDemand.status)}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                      Recomendación del agente / intake
                      <input value={labelize(suggestedDecision(selectedDemand))} readOnly style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", background: "#f9fafb" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                      Riesgo percibido
                      <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd" }}>
                        <option value="low">Bajo</option>
                        <option value="medium">Medio</option>
                        <option value="high">Alto</option>
                      </select>
                    </label>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {decisionOptions.map((option) => (
                      <label key={option.value} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, padding: 14, borderRadius: 16, border: finalDecision === option.value ? "2px solid #111827" : "1px solid #d0d5dd", cursor: "pointer" }}>
                        <input type="radio" name="finalDecision" value={option.value} checked={finalDecision === option.value} onChange={(event) => setFinalDecision(event.target.value)} />
                        <span>
                          <strong>{option.label}</strong>
                          <small style={{ display: "block", color: "#667085", marginTop: 4 }}>{option.helper}</small>
                        </span>
                      </label>
                    ))}
                  </div>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Justificación de decisión
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", font: "inherit" }} />
                  </label>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Condiciones / próximos pasos
                    <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", font: "inherit" }} />
                  </label>

                  <div style={{ padding: 16, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                    <strong>Resultado esperado:</strong> {selectedOption?.label ?? "No definido"}
                    <p style={{ marginBottom: 0, color: "#667085" }}>{selectedOption?.helper}</p>
                  </div>

                  <button onClick={() => void submitDecision()} disabled={saving} style={{ padding: "14px 18px", borderRadius: 16, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 800, fontSize: 16 }}>
                    {saving ? "Registrando decisión..." : "Registrar decisión del comité"}
                  </button>
                </div>
              )}
            </article>

            <article style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Trazabilidad reciente</h2>
              {eventPreview(selectedDemand).length === 0 ? (
                <p style={{ color: "#667085" }}>Sin eventos para mostrar.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {eventPreview(selectedDemand).map((event) => (
                    <div key={event.event_id ?? `${event.timestamp}-${event.type}`} style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                      <strong>{labelize(event.type)} · {event.actor}</strong>
                      <p style={{ margin: "6px 0", color: "#475467" }}>{event.comment}</p>
                      <small>{formatDate(event.timestamp)} · {labelize(event.from_status)} → {labelize(event.to_status)} · {labelize(event.decision)}</small>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </section>
      </section>
    </main>
  );
}
