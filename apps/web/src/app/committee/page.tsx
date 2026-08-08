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

  if (!items.length) {
    items.push({
      id: `${demand.demand_id}-created`,
      timestamp: demand.created_at,
      title: "Demanda registrada",
      detail: "Registro inicial disponible sin eventos adicionales.",
      actor: demand.request.requester_role || demand.request.requester_area,
      toStatus: demand.status,
      source: "system",
      tone: "info"
    });
  }

  return items.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

function buildEvidencePacket(demand: DemandRecord | null, timeline: TimelineItem[]) {
  if (!demand) return "Selecciona una demanda para generar el paquete de evidencia.";

  const committee = demand.committee_inputs ?? {};
  const roles = asTextArray(committee.committee_decision_recorded_roles).join(", ") || "No registrado";
  const finalDecision = asText(committee.committee_final_decision, demand.decision || "pending_committee_decision");
  const finalStatus = asText(committee.committee_final_status, demand.status);
  const reason = asText(committee.committee_reason, "No registrado");
  const conditions = asText(committee.committee_conditions, "No registradas");
  const risk = asText(committee.committee_risk_level, "No registrado");
  const actor = asText(committee.committee_decision_recorded_by, "No registrado");
  const recordedAt = asText(committee.committee_decision_recorded_at, demand.updated_at);

  const lines = [
    `# Paquete de evidencia de decisión - ${demand.request.title}`,
    "",
    "## 1. Identificación",
    `- ID de demanda: ${demand.demand_id}`,
    `- Área solicitante: ${demand.request.requester_area}`,
    `- Rol solicitante: ${demand.request.requester_role}`,
    `- Dominio sugerido: ${demand.request.domain_hint || "No definido"}`,
    `- Consumo objetivo: ${demand.request.target_consumption || "No definido"}`,
    `- Creada: ${formatDate(demand.created_at)}`,
    `- Última actualización: ${formatDate(demand.updated_at)}`,
    "",
    "## 2. Descripción ejecutiva",
    demand.request.description || "No registrada",
    "",
    "## 3. Decisión de comité",
    `- Recomendación previa: ${labelize(suggestedDecision(demand))}`,
    `- Decisión final: ${labelize(finalDecision)}`,
    `- Estado final: ${labelize(finalStatus)}`,
    `- Riesgo percibido: ${labelize(risk)}`,
    `- Actor: ${actor}`,
    `- Roles: ${roles}`,
    `- Fecha de decisión: ${formatDate(recordedAt)}`,
    "",
    "## 4. Justificación",
    reason,
    "",
    "## 5. Condiciones y próximos pasos",
    conditions,
    "",
    ...nextStepsFor(finalDecision).map((step) => `- ${step}`),
    "",
    "## 6. Brechas relevantes",
    `- Política: ${demand.policy_gaps.length ? demand.policy_gaps.join("; ") : "Sin brechas registradas"}`,
    `- Arquitectura: ${demand.architecture_gaps.length ? demand.architecture_gaps.join("; ") : "Sin brechas registradas"}`,
    `- FinOps: ${demand.finops_gaps.length ? demand.finops_gaps.join("; ") : "Sin brechas registradas"}`,
    "",
    "## 7. Timeline de evidencia",
    ...timeline.map(
      (item) =>
        `- ${formatDate(item.timestamp)} | ${item.title} | Actor: ${item.actor} | Decisión: ${labelize(item.decision)} | Estado: ${labelize(item.fromStatus)} → ${labelize(item.toStatus)} | ${item.detail}`
    ),
    "",
    "## 8. Nota de control",
    "Este paquete resume la evidencia disponible en ATLAS DataGob para revisión de comité, sponsor o auditoría. No reemplaza aprobaciones formales externas ni documentación contractual."
  ];

  return lines.join("\n");
}

function fileSafeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function fieldStyle() {
  return { padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", background: "white" };
}

function panelStyle() {
  return { padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" };
}

export default function CommitteeDecisionPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [packetCopied, setPacketCopied] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback>({
    tone: "info",
    title: "Sesión de comité lista",
    detail: "Carga el backlog, selecciona una demanda y registra una decisión con evidencia suficiente."
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
  const selectedTone = toneColors(selectedOption.tone);
  const selectedTimeline = useMemo(() => buildTimeline(selectedDemand), [selectedDemand]);
  const evidencePacket = useMemo(() => buildEvidencePacket(selectedDemand, selectedTimeline), [selectedDemand, selectedTimeline]);
  const currentCommittee = selectedDemand?.committee_inputs ?? {};
  const finalDecisionRecorded = asText(currentCommittee.committee_final_decision, selectedDemand?.decision ?? "");
  const feedbackColors = toneColors(feedback.tone);
  const canSubmit = Boolean(selectedDemand && reason.trim().length >= 10 && !saving);

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
      setPacketCopied(false);
      setFeedback({
        tone: "success",
        title: "Backlog sincronizado",
        detail: `Se cargaron ${payload.count} demandas. Pendientes de decisión: ${payload.demands.filter((item) => !hasDecision(item)).length}.`
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
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
    setPacketCopied(false);
    const suggested = demand.committee?.suggested_decision;
    if (suggested === "reformulation_required" || suggested === "rejected" || suggested === "approved_for_scoring") {
      setFinalDecision(suggested);
    } else if (suggested === "architect_review") {
      setFinalDecision("architecture_exception");
    }
    setFeedback({
      tone: hasDecision(demand) ? "success" : "info",
      title: hasDecision(demand) ? "Demanda con decisión registrada" : "Demanda seleccionada",
      detail: `${demand.demand_id} · ${demand.request.title}`,
      nextSteps: hasDecision(demand) ? ["Revisar timeline.", "Generar o copiar paquete de evidencia."] : ["Validar recomendación.", "Registrar decisión con justificación mínima."]
    });
  }

  async function submitDecision() {
    if (!selectedDemand) {
      setFeedback({ tone: "warning", title: "Selecciona una demanda", detail: "Debes elegir una demanda antes de registrar decisión." });
      return;
    }
    if (reason.trim().length < 10) {
      setFeedback({ tone: "warning", title: "Falta justificación", detail: "Agrega una justificación mínima para dejar trazabilidad." });
      return;
    }

    try {
      setSaving(true);
      setFeedback({ tone: "info", title: "Registrando decisión", detail: "El Comité Operativo está actualizando estado y evidencia de la demanda." });
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
        title: `Decisión registrada: ${labelize(String(payload.committee_decision.committee_final_decision))}`,
        detail: `Estado actualizado: ${labelize(payload.demand.status)}. El paquete de evidencia queda disponible para copiar o descargar.`,
        nextSteps: nextStepsFor(finalDecision)
      });
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setFeedback({ tone: "error", title: "No se pudo registrar la decisión", detail });
    } finally {
      setSaving(false);
    }
  }

  async function copyEvidencePacket() {
    try {
      await navigator.clipboard.writeText(evidencePacket);
      setPacketCopied(true);
      setFeedback({ tone: "success", title: "Paquete copiado", detail: "La evidencia quedó lista en el portapapeles para enviarla a comité, sponsor o auditoría." });
    } catch {
      setPacketCopied(false);
      setFeedback({ tone: "warning", title: "No se pudo copiar automáticamente", detail: "Puedes seleccionar manualmente el texto del paquete de evidencia." });
    }
  }

  function downloadEvidencePacket() {
    if (!selectedDemand) return;
    const blob = new Blob([evidencePacket], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atlas-committee-evidence-${fileSafeName(selectedDemand.demand_id)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback({ tone: "success", title: "Paquete descargado", detail: "Se generó un archivo Markdown con la evidencia de decisión de comité." });
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "#667085", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Comité operativo</h1>
            <p style={{ margin: 0, maxWidth: 820, color: "#475467", fontSize: 17 }}>
              Flujo para registrar decisiones, revisar timeline y generar un paquete de evidencia listo para comité, sponsor o auditoría.
            </p>
          </div>
          <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 700 }}>
            {loading ? "Cargando..." : "Sincronizar backlog"}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
          <article style={panelStyle()}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Backlog</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{demands.length}</strong>
            <small>Solicitudes cargadas</small>
          </article>
          <article style={panelStyle()}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Pendientes</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{reviewQueue.length}</strong>
            <small>Sin decisión formal</small>
          </article>
          <article style={panelStyle()}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Decididas</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{decidedItems.length}</strong>
            <small>Con evidencia de comité</small>
          </article>
          <article style={panelStyle()}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Eventos demanda</span>
            <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{selectedTimeline.length}</strong>
            <small>Timeline seleccionado</small>
          </article>
        </section>

        <section style={{ padding: 18, borderRadius: 18, border: `1px solid ${feedbackColors.border}`, background: feedbackColors.bg, color: feedbackColors.text }}>
          <strong style={{ display: "block", marginBottom: 4 }}>{feedback.title}</strong>
          <span>{feedback.detail}</span>
          {feedback.nextSteps?.length ? (
            <ul style={{ margin: "10px 0 0", paddingLeft: 20 }}>
              {feedback.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
          <aside style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Cola de decisión</h2>
            {demands.length === 0 ? (
              <div style={panelStyle()}>No hay demandas cargadas.</div>
            ) : (
              demands.map((demand) => {
                const selected = selectedDemandId === demand.demand_id;
                const tone = toneColors(decisionTone(asText(demand.committee_inputs?.committee_final_decision, demand.status)));
                return (
                  <button
                    key={demand.demand_id}
                    onClick={() => selectDemand(demand)}
                    style={{
                      textAlign: "left",
                      padding: 16,
                      borderRadius: 18,
                      background: selected ? "#111827" : "white",
                      color: selected ? "white" : "#101828",
                      border: `1px solid ${selected ? "#111827" : "#eaecf0"}`,
                      cursor: "pointer"
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 6 }}>{demand.request.title}</strong>
                    <small>{demand.demand_id}</small>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ color: selected ? "#d0d5dd" : tone.text, fontWeight: 800 }}>{labelize(demand.status)}</span>
                      <span>· {hasDecision(demand) ? "evidencia lista" : "pendiente"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          <section style={{ display: "grid", gap: 18 }}>
            <article style={panelStyle()}>
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
                      Recomendación previa
                      <input value={labelize(suggestedDecision(selectedDemand))} readOnly style={{ ...fieldStyle(), background: "#f9fafb" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                      Riesgo percibido
                      <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} style={fieldStyle()}>
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
                            <small style={{ display: "block", color: colors.text, marginTop: 4, fontWeight: 800 }}>{option.outcome}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <section style={{ padding: 16, borderRadius: 18, background: selectedTone.bg, border: `1px solid ${selectedTone.border}`, color: selectedTone.text }}>
                    <strong>Vista previa del resultado</strong>
                    <p style={{ margin: "6px 0 0" }}>{selectedOption.outcome}. El paquete de evidencia incluirá motivo, condiciones, actor, roles y timeline.</p>
                  </section>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Justificación de decisión
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} style={fieldStyle()} />
                    <small style={{ color: reason.trim().length >= 10 ? "#067647" : "#b54708" }}>{reason.trim().length >= 10 ? "Justificación suficiente." : "Agrega al menos 10 caracteres para dejar trazabilidad."}</small>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Condiciones / próximos pasos
                    <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} style={fieldStyle()} />
                  </label>

                  <button onClick={() => void submitDecision()} disabled={!canSubmit} style={{ padding: "14px 18px", borderRadius: 999, border: "1px solid #991b1b", background: canSubmit ? "#991b1b" : "#d0d5dd", color: "white", fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                    {saving ? "Registrando decisión..." : "Registrar decisión y actualizar evidencia"}
                  </button>
                </div>
              )}
            </article>

            {selectedDemand ? (
              <article style={panelStyle()}>
                <h2 style={{ marginTop: 0 }}>Historial de decisión</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}>
                    <small>Decisión final</small>
                    <strong style={{ display: "block", marginTop: 6 }}>{labelize(finalDecisionRecorded || "pendiente")}</strong>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}>
                    <small>Actor</small>
                    <strong style={{ display: "block", marginTop: 6 }}>{asText(currentCommittee.committee_decision_recorded_by, "No registrado")}</strong>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}>
                    <small>Fecha</small>
                    <strong style={{ display: "block", marginTop: 6 }}>{formatDate(asText(currentCommittee.committee_decision_recorded_at, selectedDemand.updated_at))}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <strong>Motivo final</strong>
                  <p style={{ margin: 0, color: "#475467" }}>{asText(currentCommittee.committee_reason, "Aún no se registra motivo formal del comité.")}</p>
                  <strong>Condiciones</strong>
                  <p style={{ margin: 0, color: "#475467" }}>{asText(currentCommittee.committee_conditions, "Aún no se registran condiciones.")}</p>
                </div>
              </article>
            ) : null}

            {selectedDemand ? (
              <article style={panelStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Paquete de evidencia</h2>
                    <p style={{ margin: "6px 0 0", color: "#667085" }}>Resumen Markdown listo para comité, sponsor o auditoría.</p>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => void copyEvidencePacket()} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 800 }}>
                      {packetCopied ? "Copiado" : "Copiar paquete"}
                    </button>
                    <button onClick={downloadEvidencePacket} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #991b1b", background: "white", color: "#991b1b", fontWeight: 800 }}>
                      Descargar Markdown
                    </button>
                  </div>
                </div>
                <textarea value={evidencePacket} readOnly rows={18} style={{ marginTop: 16, width: "100%", boxSizing: "border-box", padding: 16, borderRadius: 16, border: "1px solid #d0d5dd", background: "#0f172a", color: "#e2e8f0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.5 }} />
              </article>
            ) : null}

            {selectedDemand ? (
              <article style={panelStyle()}>
                <h2 style={{ marginTop: 0 }}>Timeline de evidencia</h2>
                <div style={{ display: "grid", gap: 12 }}>
                  {selectedTimeline.map((item) => {
                    const colors = toneColors(item.tone);
                    return (
                      <div key={item.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14, padding: 14, borderRadius: 18, border: `1px solid ${colors.border}`, background: colors.bg }}>
                        <div>
                          <strong style={{ color: colors.text }}>{formatDate(item.timestamp)}</strong>
                          <small style={{ display: "block", marginTop: 4, color: "#667085" }}>{item.source}</small>
                        </div>
                        <div>
                          <strong>{item.title}</strong>
                          <p style={{ margin: "6px 0", color: "#475467" }}>{compact(item.detail, 220)}</p>
                          <small>
                            Actor: {item.actor} · Estado: {labelize(item.fromStatus)} → {labelize(item.toStatus)} · Decisión: {labelize(item.decision)}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ) : null}
          </section>
        </section>
      </section>
    </main>
  );
}
