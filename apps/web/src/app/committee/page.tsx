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
type FeedbackTone = "info" | "success" | "warning" | "error";

type ActionFeedback = {
  tone: FeedbackTone;
  title: string;
  detail: string;
  nextSteps?: string[];
};

type DecisionOption = {
  value: string;
  label: string;
  helper: string;
  outcome: string;
  tone: FeedbackTone;
};

const decisionOptions: DecisionOption[] = [
  {
    value: "approved_for_scoring",
    label: "Aprobar para scoring",
    helper: "La demanda queda lista para priorización cuantitativa.",
    outcome: "Estado esperado: approved for scoring",
    tone: "success"
  },
  {
    value: "reformulation_required",
    label: "Solicitar reformulación",
    helper: "La demanda vuelve al solicitante con observaciones claras.",
    outcome: "Estado esperado: reformulation required",
    tone: "warning"
  },
  {
    value: "rejected",
    label: "Rechazar",
    helper: "La demanda se cierra por bajo valor, alto riesgo o falta de alineamiento.",
    outcome: "Estado esperado: rejected",
    tone: "error"
  },
  {
    value: "architecture_exception",
    label: "Registrar excepción arquitectónica",
    helper: "La demanda queda en revisión por excepción o validación del Arquitecto de Datos.",
    outcome: "Estado esperado: operative committee review",
    tone: "warning"
  }
];

const toneColor: Record<FeedbackTone, { border: string; background: string; text: string }> = {
  info: { border: "#b2ddff", background: "#eff8ff", text: "#175cd3" },
  success: { border: "#abefc6", background: "#ecfdf3", text: "#067647" },
  warning: { border: "#fedf89", background: "#fffaeb", text: "#b54708" },
  error: { border: "#fecdca", background: "#fef3f2", text: "#b42318" }
};

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

function statusColor(status: string) {
  if (status.includes("approved") || status.includes("scored")) return "#067647";
  if (status.includes("rejected")) return "#b42318";
  if (status.includes("review") || status.includes("reformulation")) return "#b54708";
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

function safeErrorMessage(status: number, text: string) {
  if (status === 401) return "No se pudo autenticar la sesión. Revisa la configuración de identidad web.";
  if (status === 403) return "Tu rol actual no puede registrar decisiones del comité. Usa committee_member, data_architect o platform_admin.";
  if (status === 400) return "La decisión no cumple las reglas del flujo. Revisa estado, decisión final y justificación.";
  if (status >= 500) return "El backend no pudo procesar la decisión. Revisa API, persistencia y logs.";
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

function feedbackForDecision(decision: string, demand: DemandRecord): ActionFeedback {
  if (decision === "approved_for_scoring") {
    return {
      tone: "success",
      title: "Decisión registrada: aprobada para scoring",
      detail: `${demand.demand_id} quedó lista para priorización y scoring gobernado.`,
      nextSteps: ["Completar scoring si aún no existe.", "Revisar ranking ejecutivo.", "Preparar evidencia para siguiente gate."]
    };
  }
  if (decision === "reformulation_required") {
    return {
      tone: "warning",
      title: "Decisión registrada: requiere reformulación",
      detail: `${demand.demand_id} debe volver al solicitante con observaciones claras.`,
      nextSteps: ["Enviar observaciones al Data Owner.", "Ajustar alcance o evidencias.", "Reingresar al comité cuando esté lista."]
    };
  }
  if (decision === "rejected") {
    return {
      tone: "error",
      title: "Decisión registrada: demanda rechazada",
      detail: `${demand.demand_id} quedó cerrada por decisión del Comité Operativo.`,
      nextSteps: ["Conservar justificación.", "Comunicar decisión al área solicitante.", "Archivar cuando aplique."]
    };
  }
  return {
    tone: "warning",
    title: "Decisión registrada: excepción arquitectónica",
    detail: `${demand.demand_id} queda en revisión por excepción o validación del Arquitecto de Datos.`,
    nextSteps: ["Asignar Arquitecto de Datos.", "Documentar excepción.", "Definir condición para aprobar o reformular."]
  };
}

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: "#f2f4f7", color: color ?? "#344054", fontSize: 12, fontWeight: 800 }}>
      {children}
    </span>
  );
}

function FeedbackPanel({ feedback }: { feedback: ActionFeedback }) {
  const colors = toneColor[feedback.tone];
  return (
    <section aria-live="polite" style={{ padding: 18, borderRadius: 18, border: `1px solid ${colors.border}`, background: colors.background, color: colors.text }}>
      <strong style={{ display: "block", fontSize: 16 }}>{feedback.title}</strong>
      <p style={{ margin: "6px 0 0", color: colors.text }}>{feedback.detail}</p>
      {feedback.nextSteps?.length ? (
        <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
          {feedback.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function CommitteeDecisionPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Carga el backlog para iniciar la sesión de comité.");
  const [feedback, setFeedback] = useState<ActionFeedback>({
    tone: "info",
    title: "Sesión de comité lista",
    detail: "Selecciona una demanda, revisa la recomendación y registra una decisión final con justificación."
  });
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
  const selectedOption = decisionOptions.find((item) => item.value === finalDecision) ?? decisionOptions[0];
  const canSubmit = Boolean(selectedDemand) && reason.trim().length >= 10 && !saving;

  async function loadBacklog(highlightId?: string) {
    try {
      setLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(safeErrorMessage(response.status, text));
      const payload = JSON.parse(text) as BacklogResponse;
      setDemands(payload.demands);
      const nextSelection = highlightId || selectedDemandId || payload.demands[0]?.demand_id || "";
      setSelectedDemandId(nextSelection);
      setMessage(`Backlog cargado: ${payload.count} demandas. Pendientes de decisión: ${payload.demands.filter((item) => !hasDecision(item)).length}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo cargar el backlog: ${detail}`);
      setFeedback({ tone: "error", title: "No se pudo cargar el backlog", detail });
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
    setFeedback({
      tone: hasDecision(demand) ? "success" : "info",
      title: hasDecision(demand) ? "Esta demanda ya tiene decisión" : "Demanda lista para evaluación",
      detail: hasDecision(demand)
        ? "Puedes revisar la trazabilidad o registrar una nueva decisión solo si el comité decide actualizarla."
        : "Revisa recomendación, riesgos, justificación y condiciones antes de registrar la decisión."
    });
  }

  async function submitDecision() {
    if (!selectedDemand) {
      setFeedback({ tone: "warning", title: "Selecciona una demanda", detail: "No hay una demanda activa para registrar decisión." });
      return;
    }
    if (reason.trim().length < 10) {
      setFeedback({ tone: "warning", title: "Justificación insuficiente", detail: "Agrega una justificación mínima para dejar trazabilidad auditable." });
      return;
    }

    try {
      setSaving(true);
      setMessage("Registrando decisión del Comité Operativo...");
      setFeedback({ tone: "info", title: "Registrando decisión", detail: "ATLAS está guardando la decisión, actualizando estado y registrando trazabilidad." });
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
      if (!response.ok) throw new Error(safeErrorMessage(response.status, text));
      const payload = JSON.parse(text) as DecisionResponse;
      setDemands((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setMessage(`Decisión registrada: ${labelize(String(payload.committee_decision.committee_final_decision))}. Estado: ${labelize(payload.demand.status)}.`);
      setFeedback(feedbackForDecision(String(payload.committee_decision.committee_final_decision), payload.demand));
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo registrar la decisión: ${detail}`);
      setFeedback({ tone: "error", title: "Decisión no registrada", detail, nextSteps: ["Revisa rol de sesión.", "Valida el estado actual de la demanda.", "Sincroniza backlog e intenta nuevamente."] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#667085", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Comité operativo</h1>
            <p style={{ margin: 0, maxWidth: 760, color: "#475467", fontSize: 17 }}>
              Flujo pragmático para registrar decisión final, justificación, condiciones y trazabilidad con feedback claro para piloto.
            </p>
          </div>
          <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid #111827", background: loading ? "#667085" : "#111827", color: "white", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
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

        <FeedbackPanel feedback={feedback} />
        <p style={{ padding: 14, borderRadius: 14, background: "#eef4ff", color: "#3538cd", margin: 0, fontWeight: 700 }}>{message}</p>

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
                    border: hasDecision(demand) ? "1px solid #abefc6" : "1px solid #eaecf0",
                    cursor: "pointer"
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 6 }}>{demand.request.title}</strong>
                  <small>{demand.demand_id}</small>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: selectedDemandId === demand.demand_id ? "#d0d5dd" : statusColor(demand.status), fontWeight: 800 }}>{labelize(demand.status)}</span>
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
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Pill>ID: {selectedDemand.demand_id}</Pill>
                      <Pill>Área: {selectedDemand.request.requester_area}</Pill>
                      <Pill>Dominio: {selectedDemand.request.domain_hint || "No definido"}</Pill>
                      <Pill color={statusColor(selectedDemand.status)}>Estado: {labelize(selectedDemand.status)}</Pill>
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
                      <label key={option.value} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, padding: 14, borderRadius: 16, border: finalDecision === option.value ? "2px solid #111827" : "1px solid #d0d5dd", cursor: "pointer", background: finalDecision === option.value ? "#f9fafb" : "white" }}>
                        <input type="radio" name="finalDecision" value={option.value} checked={finalDecision === option.value} onChange={(event) => setFinalDecision(event.target.value)} />
                        <span>
                          <strong>{option.label}</strong>
                          <small style={{ display: "block", color: "#667085", marginTop: 4 }}>{option.helper}</small>
                          <small style={{ display: "block", color: toneColor[option.tone].text, marginTop: 4, fontWeight: 800 }}>{option.outcome}</small>
                        </span>
                      </label>
                    ))}
                  </div>

                  <section style={{ padding: 16, borderRadius: 16, background: toneColor[selectedOption.tone].background, border: `1px solid ${toneColor[selectedOption.tone].border}`, color: toneColor[selectedOption.tone].text }}>
                    <strong>Vista previa de resultado</strong>
                    <p style={{ margin: "6px 0 0" }}>{selectedOption.outcome}. Esta acción quedará registrada con usuario, roles, justificación y condiciones.</p>
                  </section>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Justificación de decisión
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", resize: "vertical" }} />
                  </label>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Condiciones / próximos pasos
                    <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", resize: "vertical" }} />
                  </label>

                  <button onClick={() => void submitDecision()} disabled={!canSubmit} style={{ padding: "14px 18px", borderRadius: 16, border: "none", background: canSubmit ? "#991b1b" : "#d0d5dd", color: "white", fontWeight: 900, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                    {saving ? "Registrando decisión..." : canSubmit ? "Registrar decisión final" : "Completa la justificación para decidir"}
                  </button>
                </div>
              )}
            </article>

            <article style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Trazabilidad reciente</h2>
              {eventPreview(selectedDemand).length === 0 ? (
                <p>No hay eventos para mostrar.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {eventPreview(selectedDemand).map((event) => (
                    <div key={event.event_id ?? `${event.timestamp}-${event.type}`} style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                      <strong>{labelize(event.type)}</strong>
                      <p style={{ margin: "4px 0", color: "#475467" }}>{event.comment}</p>
                      <small>{formatDate(event.timestamp)} · {event.actor} · {labelize(event.to_status)}</small>
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
