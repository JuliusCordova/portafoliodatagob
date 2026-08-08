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

type TimelineItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  actor: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  decision?: string | null;
  source: "event" | "committee" | "system";
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

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function compact(value: string | undefined | null, size = 110) {
  const text = value?.trim() || "No definido";
  return text.length > size ? `${text.slice(0, size)}…` : text;
}

function formatDate(value: string | undefined) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value : fallback;
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function suggestedDecision(demand: DemandRecord | null) {
  return demand?.committee?.suggested_decision ?? asText(demand?.committee_inputs?.committee_recommendation, "pending_committee_recommendation");
}

function hasDecision(demand: DemandRecord) {
  return Boolean(demand.committee_inputs?.committee_final_decision || demand.validation_state?.committee_decision_recorded);
}

function decisionTone(value: string | undefined | null): FeedbackTone {
  const normalized = value ?? "";
  if (normalized.includes("approved") || normalized.includes("scored")) return "success";
  if (normalized.includes("rejected")) return "error";
  if (normalized.includes("review") || normalized.includes("reformulation") || normalized.includes("exception")) return "warning";
  return "info";
}

function toneColors(tone: FeedbackTone) {
  if (tone === "success") return { border: "#abefc6", bg: "#ecfdf3", text: "#067647", soft: "#dcfae6" };
  if (tone === "warning") return { border: "#fedf89", bg: "#fffaeb", text: "#b54708", soft: "#fef0c7" };
  if (tone === "error") return { border: "#fecdca", bg: "#fef3f2", text: "#b42318", soft: "#fee4e2" };
  return { border: "#b2ddff", bg: "#eff8ff", text: "#175cd3", soft: "#d1e9ff" };
}

function nextStepsFor(decision: string): string[] {
  if (decision === "approved_for_scoring") {
    return ["Completar o validar criterios de scoring.", "Revisar prioridad y valor financiero.", "Enviar al siguiente gate de portafolio."];
  }
  if (decision === "reformulation_required") {
    return ["Enviar observaciones al Data Owner.", "Solicitar información faltante o ajuste de alcance.", "Reingresar la demanda cuando esté completa."];
  }
  if (decision === "rejected") {
    return ["Registrar motivo de cierre.", "Comunicar la decisión al solicitante.", "Archivar o dejar evidencia para auditoría futura."];
  }
  return ["Solicitar validación del Arquitecto de Datos.", "Documentar excepción, riesgo y condiciones.", "No avanzar a scoring hasta cerrar la excepción."];
}

function explainHttpError(status: number, body: string) {
  if (status === 400) return "La solicitud no tiene todos los campos requeridos o la decisión no está soportada.";
  if (status === 401) return "No se pudo autenticar la sesión actual. Revisa la propagación de identidad.";
  if (status === 403) return "Tu rol actual no permite registrar decisiones de comité. Usa committee_member, data_architect o platform_admin.";
  if (status >= 500) return "El backend no pudo procesar la decisión. Revisa logs del API o disponibilidad del servicio.";
  return body || "No se pudo completar la operación.";
}

function eventTitle(event: DemandEvent) {
  if (event.type === "status_changed") return "Cambio de estado";
  if (event.type === "demand_updated") return "Actualización de demanda";
  if (event.type === "scoring_updated") return "Scoring registrado";
  if (event.type === "demand_created") return "Demanda creada";
  if (event.type === "demo_reset") return "Registro de demo cargado";
  return labelize(event.type);
}

function buildTimeline(demand: DemandRecord | null): TimelineItem[] {
  if (!demand) return [];
  const committee = demand.committee_inputs ?? {};
  const items: TimelineItem[] = [];

  if (committee.committee_final_decision || committee.committee_decision_recorded_at) {
    const finalDecision = asText(committee.committee_final_decision, "pending_committee_decision");
    items.push({
      id: `${demand.demand_id}-committee-final`,
      timestamp: asText(committee.committee_decision_recorded_at, demand.updated_at),
      title: "Decisión final del comité",
      detail: asText(committee.committee_reason, "Decisión registrada por el Comité Operativo."),
      actor: asText(committee.committee_decision_recorded_by, "Comité Operativo"),
      fromStatus: asText(committee.committee_recommendation, "pending_committee_recommendation"),
      toStatus: asText(committee.committee_final_status, demand.status),
      decision: finalDecision,
      source: "committee",
      tone: decisionTone(finalDecision)
    });
  }

  demand.events.forEach((event, index) => {
    items.push({
      id: event.event_id ?? `${demand.demand_id}-event-${index}`,
      timestamp: event.timestamp,
      title: eventTitle(event),
      detail: event.comment,
      actor: event.actor,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      decision: event.decision,
      source: "event",
      tone: decisionTone(event.decision ?? event.to_status)
    });
  });

  return items.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

function decisionHistorySummary(demand: DemandRecord | null) {
  if (!demand) return [];
  const committee = demand.committee_inputs ?? {};
  return [
    { label: "Recomendación previa", value: labelize(asText(committee.committee_recommendation, suggestedDecision(demand))) },
    { label: "Decisión final", value: labelize(asText(committee.committee_final_decision, demand.decision)) },
    { label: "Estado final", value: labelize(asText(committee.committee_final_status, demand.status)) },
    { label: "Actor", value: asText(committee.committee_decision_recorded_by, "Pendiente") },
    { label: "Roles", value: asTextArray(committee.committee_decision_recorded_roles).join(", ") || "Pendiente" },
    { label: "Fecha", value: formatDate(asText(committee.committee_decision_recorded_at, demand.updated_at)) }
  ];
}

function latestTimelineItem(demand: DemandRecord) {
  return buildTimeline(demand)[0];
}

export default function CommitteeDecisionPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback>({
    tone: "info",
    title: "Sesión de comité lista",
    detail: "Carga el backlog para iniciar la revisión de decisiones.",
    nextSteps: ["Selecciona una demanda.", "Revisa recomendación y brechas.", "Registra decisión con justificación."]
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
  const timelineItems = useMemo(() => buildTimeline(selectedDemand), [selectedDemand]);
  const historySummary = useMemo(() => decisionHistorySummary(selectedDemand), [selectedDemand]);
  const selectedOption = decisionOptions.find((item) => item.value === finalDecision) ?? decisionOptions[0];
  const feedbackColors = toneColors(feedback.tone);
  const decisionReady = Boolean(selectedDemand && reason.trim().length >= 10 && !saving);

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
      setFeedback({
        tone: "success",
        title: "Backlog sincronizado",
        detail: `${payload.count} demandas cargadas. ${payload.demands.filter((item) => !hasDecision(item)).length} siguen pendientes de decisión formal.`,
        nextSteps: ["Selecciona una demanda.", "Revisa su historia.", "Registra o valida la decisión de comité."]
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setFeedback({
        tone: "error",
        title: "No se pudo cargar el backlog",
        detail,
        nextSteps: ["Verifica que el API esté activo.", "Revisa ATLAS_INTERNAL_API_BASE.", "Intenta sincronizar nuevamente."]
      });
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
    const latest = latestTimelineItem(demand);
    setFeedback({
      tone: hasDecision(demand) ? "success" : "info",
      title: hasDecision(demand) ? "Demanda con decisión registrada" : "Demanda seleccionada",
      detail: latest ? `Último evento: ${latest.title} · ${formatDate(latest.timestamp)}` : `Demanda seleccionada: ${demand.demand_id}`,
      nextSteps: hasDecision(demand)
        ? ["Revisa el resumen histórico.", "Valida condiciones y actor.", "Continúa con scoring o cierre según corresponda."]
        : ["Revisa recomendación del agente.", "Evalúa brechas y riesgo.", "Registra decisión con justificación."]
    });
  }

  async function submitDecision() {
    if (!selectedDemand) {
      setFeedback({ tone: "warning", title: "Sin demanda seleccionada", detail: "Selecciona una demanda antes de registrar decisión." });
      return;
    }
    if (reason.trim().length < 10) {
      setFeedback({ tone: "warning", title: "Falta justificación", detail: "Agrega una justificación mínima para dejar trazabilidad de comité." });
      return;
    }

    try {
      setSaving(true);
      setFeedback({
        tone: "info",
        title: "Registrando decisión",
        detail: "ATLAS está persistiendo la decisión, actualizando estado y generando trazabilidad.",
        nextSteps: ["Mantén esta pantalla abierta.", "Espera confirmación del backend."]
      });
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
      if (!response.ok) throw new Error(explainHttpError(response.status, text));
      const payload = JSON.parse(text) as DecisionResponse;
      setDemands((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setFeedback({
        tone: selectedOption.tone,
        title: "Decisión registrada",
        detail: `${labelize(String(payload.committee_decision.committee_final_decision))} · Estado: ${labelize(payload.demand.status)}.`,
        nextSteps: nextStepsFor(finalDecision)
      });
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setFeedback({
        tone: "error",
        title: "No se pudo registrar la decisión",
        detail,
        nextSteps: ["Revisa rol de sesión.", "Confirma que la demanda permite transición de estado.", "Vuelve a sincronizar backlog."]
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#667085", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Comité operativo · Timeline</h1>
            <p style={{ margin: 0, maxWidth: 790, color: "#475467", fontSize: 17 }}>
              Línea de tiempo enriquecida para revisar decisión final, recomendación previa, actor, condiciones, riesgo y evolución de estado por demanda.
            </p>
          </div>
          <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 700 }}>
            {loading ? "Cargando..." : "Sincronizar backlog"}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Backlog</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{demands.length}</strong>
            <small>Solicitudes cargadas</small>
          </article>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Pendientes</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{reviewQueue.length}</strong>
            <small>Sin decisión formal</small>
          </article>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Decididas</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{decidedItems.length}</strong>
            <small>Con trazabilidad</small>
          </article>
          <article style={{ padding: 20, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Eventos visibles</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{timelineItems.length}</strong>
            <small>Para demanda seleccionada</small>
          </article>
        </section>

        <section style={{ padding: 18, borderRadius: 18, background: feedbackColors.bg, border: `1px solid ${feedbackColors.border}`, color: feedbackColors.text }}>
          <strong style={{ display: "block", marginBottom: 6 }}>{feedback.title}</strong>
          <p style={{ margin: 0 }}>{feedback.detail}</p>
          {feedback.nextSteps?.length ? (
            <ul style={{ margin: "10px 0 0", paddingLeft: 20 }}>
              {feedback.nextSteps.map((step) => <li key={step}>{step}</li>)}
            </ul>
          ) : null}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr) 380px", gap: 20, alignItems: "start" }}>
          <aside style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Cola de decisión</h2>
            {demands.length === 0 ? (
              <div style={{ padding: 20, borderRadius: 18, background: "white", border: "1px solid #eaecf0" }}>No hay demandas cargadas.</div>
            ) : (
              demands.map((demand) => {
                const latest = latestTimelineItem(demand);
                const active = selectedDemandId === demand.demand_id;
                return (
                  <button
                    key={demand.demand_id}
                    onClick={() => selectDemand(demand)}
                    style={{
                      textAlign: "left",
                      padding: 16,
                      borderRadius: 18,
                      background: active ? "#111827" : "white",
                      color: active ? "white" : "#101828",
                      border: "1px solid #eaecf0",
                      cursor: "pointer"
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 6 }}>{compact(demand.request.title, 70)}</strong>
                    <small>{demand.demand_id}</small>
                    <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                      <span style={{ color: active ? "#d0d5dd" : toneColors(decisionTone(demand.status)).text, fontWeight: 800 }}>{labelize(demand.status)}</span>
                      <span>{hasDecision(demand) ? "Decisión registrada" : "Pendiente"}</span>
                      {latest ? <small>Último evento: {formatDate(latest.timestamp)}</small> : null}
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          <section style={{ display: "grid", gap: 18 }}>
            <article style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Decisión del comité</h2>
              {!selectedDemand ? (
                <p>Selecciona una demanda para registrar o revisar decisión.</p>
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

                  <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {historySummary.map((item) => (
                      <div key={item.label} style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                        <small style={{ color: "#667085", fontWeight: 800 }}>{item.label}</small>
                        <strong style={{ display: "block", marginTop: 4 }}>{item.value}</strong>
                      </div>
                    ))}
                  </section>

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
                    {decisionOptions.map((option) => {
                      const selected = finalDecision === option.value;
                      const colors = toneColors(option.tone);
                      return (
                        <label key={option.value} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, padding: 14, borderRadius: 16, border: selected ? `2px solid ${colors.text}` : "1px solid #d0d5dd", background: selected ? colors.bg : "white", cursor: "pointer" }}>
                          <input type="radio" name="finalDecision" value={option.value} checked={selected} onChange={(event) => setFinalDecision(event.target.value)} />
                          <span>
                            <strong>{option.label}</strong>
                            <small style={{ display: "block", color: "#667085", marginTop: 4 }}>{option.helper}</small>
                            <small style={{ display: "block", color: colors.text, fontWeight: 800, marginTop: 6 }}>{option.outcome}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Justificación de decisión
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", resize: "vertical" }} />
                    <small style={{ color: reason.trim().length >= 10 ? "#067647" : "#b54708" }}>{reason.trim().length >= 10 ? "Justificación suficiente para trazabilidad." : "Agrega al menos 10 caracteres."}</small>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Condiciones / próximos pasos
                    <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", resize: "vertical" }} />
                  </label>

                  <article style={{ padding: 16, borderRadius: 18, background: toneColors(selectedOption.tone).bg, border: `1px solid ${toneColors(selectedOption.tone).border}` }}>
                    <strong style={{ color: toneColors(selectedOption.tone).text }}>Vista previa del resultado</strong>
                    <p style={{ margin: "8px 0 0" }}>{selectedOption.outcome}. Se registrará con riesgo {labelize(riskLevel)}, recomendación previa {labelize(suggestedDecision(selectedDemand))} y justificación auditada.</p>
                  </article>

                  <button onClick={() => void submitDecision()} disabled={!decisionReady} style={{ padding: "14px 18px", borderRadius: 16, border: "none", background: decisionReady ? "#991b1b" : "#d0d5dd", color: "white", fontWeight: 900, cursor: decisionReady ? "pointer" : "not-allowed" }}>
                    {saving ? "Registrando decisión..." : "Registrar decisión del comité"}
                  </button>
                </div>
              )}
            </article>
          </section>

          <aside style={{ display: "grid", gap: 16 }}>
            <article style={{ padding: 20, borderRadius: 22, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Historial enriquecido</h2>
              {!selectedDemand ? (
                <p style={{ color: "#667085" }}>Selecciona una demanda para ver historial.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                    <small style={{ color: "#667085", fontWeight: 800 }}>Motivo final registrado</small>
                    <p style={{ margin: "6px 0 0" }}>{asText(selectedDemand.committee_inputs?.committee_reason, "Pendiente de decisión formal.")}</p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                    <small style={{ color: "#667085", fontWeight: 800 }}>Condiciones</small>
                    <p style={{ margin: "6px 0 0" }}>{asText(selectedDemand.committee_inputs?.committee_conditions, "Sin condiciones registradas aún.")}</p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                    <small style={{ color: "#667085", fontWeight: 800 }}>Riesgo de comité</small>
                    <strong style={{ display: "block", marginTop: 6 }}>{labelize(asText(selectedDemand.committee_inputs?.committee_risk_level, "Pendiente"))}</strong>
                  </div>
                </div>
              )}
            </article>

            <article style={{ padding: 20, borderRadius: 22, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Timeline</h2>
              {timelineItems.length === 0 ? (
                <p style={{ color: "#667085" }}>No hay eventos para mostrar.</p>
              ) : (
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                  {timelineItems.map((item) => {
                    const colors = toneColors(item.tone);
                    return (
                      <li key={item.id} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 10 }}>
                        <span style={{ width: 14, height: 14, marginTop: 5, borderRadius: 99, background: colors.text, boxShadow: `0 0 0 4px ${colors.soft}` }} />
                        <div style={{ paddingBottom: 12, borderBottom: "1px solid #eaecf0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <strong>{item.title}</strong>
                            <small style={{ color: "#667085" }}>{formatDate(item.timestamp)}</small>
                          </div>
                          <p style={{ margin: "6px 0", color: "#475467" }}>{item.detail}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
                            <span style={{ padding: "4px 8px", borderRadius: 99, background: colors.bg, color: colors.text, fontWeight: 800 }}>{item.source}</span>
                            <span>Actor: {item.actor}</span>
                            {item.decision ? <span>Decisión: {labelize(item.decision)}</span> : null}
                            {item.fromStatus || item.toStatus ? <span>{labelize(item.fromStatus)} → {labelize(item.toStatus)}</span> : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
