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
type FeedbackTone = "info" | "success" | "warning" | "error";
type SponsorOutcome = "sponsor_acknowledged" | "sponsor_observation" | "sponsor_adjustment_requested" | "sponsor_paused";

type SponsorOutcomeOption = {
  value: SponsorOutcome;
  label: string;
  helper: string;
  tone: FeedbackTone;
};

const sponsorOutcomeOptions: SponsorOutcomeOption[] = [
  {
    value: "sponsor_acknowledged",
    label: "Visto bueno",
    helper: "El sponsor toma conocimiento y permite continuar con el siguiente paso.",
    tone: "success"
  },
  {
    value: "sponsor_observation",
    label: "Con observaciones",
    helper: "El sponsor acepta revisar, pero deja comentarios para seguimiento.",
    tone: "info"
  },
  {
    value: "sponsor_adjustment_requested",
    label: "Solicita ajuste",
    helper: "El sponsor requiere reformular alcance, evidencia o condiciones antes de avanzar.",
    tone: "warning"
  },
  {
    value: "sponsor_paused",
    label: "Pausa ejecutiva",
    helper: "El sponsor solicita pausar la demanda hasta nueva definición.",
    tone: "error"
  }
];

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function asText(value: unknown, fallback = "No definido") {
  return typeof value === "string" && value.trim().length ? value : fallback;
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatDate(value: string | undefined) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function hasCommitteeDecision(demand: DemandRecord) {
  return Boolean(demand.committee_inputs?.committee_final_decision || demand.validation_state?.committee_decision_recorded);
}

function toneColors(tone: FeedbackTone) {
  if (tone === "success") return { border: "#abefc6", bg: "#ecfdf3", text: "#067647", soft: "#dcfae6" };
  if (tone === "warning") return { border: "#fedf89", bg: "#fffaeb", text: "#b54708", soft: "#fef0c7" };
  if (tone === "error") return { border: "#fecdca", bg: "#fef3f2", text: "#b42318", soft: "#fee4e2" };
  return { border: "#b2ddff", bg: "#eff8ff", text: "#175cd3", soft: "#d1e9ff" };
}

function outcomeOption(value: string | undefined | null) {
  return sponsorOutcomeOptions.find((item) => item.value === value) ?? sponsorOutcomeOptions[0];
}

function hasSponsorReview(demand: DemandRecord | null) {
  return Boolean(demand?.committee_inputs?.sponsor_review_outcome);
}

function buildDecisionPacket(demand: DemandRecord | null) {
  if (!demand) return "Selecciona una demanda para generar el paquete de decisión.";
  const committee = demand.committee_inputs ?? {};
  const roles = asTextArray(committee.committee_decision_recorded_roles).join(", ") || "No definido";
  const sponsorOutcome = asText(committee.sponsor_review_outcome, "Pendiente de revisión sponsor");
  const gaps = [
    ...demand.policy_gaps.map((gap) => `Política: ${gap}`),
    ...demand.architecture_gaps.map((gap) => `Arquitectura: ${gap}`),
    ...demand.finops_gaps.map((gap) => `FinOps: ${gap}`)
  ];
  const timeline = [...demand.events]
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .map((event) => `- ${formatDate(event.timestamp)} | ${event.actor} | ${labelize(event.from_status)} → ${labelize(event.to_status)} | ${event.comment}`)
    .join("\n") || "- Sin eventos registrados.";

  return `# Paquete de decisión · ATLAS DataGob\n\n## 1. Identificación\n- Demanda: ${demand.demand_id}\n- Título: ${demand.request.title}\n- Área solicitante: ${demand.request.requester_area}\n- Rol solicitante: ${demand.request.requester_role}\n- Dominio: ${demand.request.domain_hint || "No definido"}\n- Consumo objetivo: ${demand.request.target_consumption || "No definido"}\n\n## 2. Descripción ejecutiva\n${demand.request.description}\n\n## 3. Decisión del Comité Operativo\n- Recomendación previa: ${labelize(asText(committee.committee_recommendation, demand.committee?.suggested_decision ?? "pending_committee_recommendation"))}\n- Decisión final: ${labelize(asText(committee.committee_final_decision, demand.decision))}\n- Estado final: ${labelize(asText(committee.committee_final_status, demand.status))}\n- Riesgo comité: ${labelize(asText(committee.committee_risk_level, "medium"))}\n- Actor: ${asText(committee.committee_decision_recorded_by, "Comité Operativo")}\n- Roles: ${roles}\n- Fecha: ${formatDate(asText(committee.committee_decision_recorded_at, demand.updated_at))}\n\n## 4. Justificación\n${asText(committee.committee_reason, "No definido")}\n\n## 5. Condiciones y próximos pasos\n${asText(committee.committee_conditions, "Sin condiciones registradas.")}\n\n## 6. Resultado sponsor\n- Resultado: ${labelize(sponsorOutcome)}\n- Sponsor / revisor: ${asText(committee.sponsor_reviewed_by, "Pendiente")}\n- Fecha revisión: ${formatDate(asText(committee.sponsor_reviewed_at, ""))}\n- Comentarios: ${asText(committee.sponsor_review_comment, "Pendiente de comentarios.")}\n\n## 7. Brechas registradas\n${gaps.length ? gaps.map((gap) => `- ${gap}`).join("\n") : "- Sin brechas registradas."}\n\n## 8. Línea de tiempo\n${timeline}\n\n## 9. Criterio de uso\nEste paquete consolida la evidencia disponible para revisión de sponsor, comité, auditoría o seguimiento de portafolio.\n`;
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SponsorReviewPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Cargando paquetes de decisión...");
  const [sponsorName, setSponsorName] = useState("Sponsor Ejecutivo");
  const [sponsorOutcome, setSponsorOutcome] = useState<SponsorOutcome>("sponsor_acknowledged");
  const [sponsorComment, setSponsorComment] = useState("Revisión ejecutiva realizada sobre la evidencia presentada.");

  const decidedDemands = useMemo(() => demands.filter(hasCommitteeDecision), [demands]);
  const selectedDemand = useMemo(
    () => decidedDemands.find((item) => item.demand_id === selectedDemandId) ?? decidedDemands[0] ?? null,
    [decidedDemands, selectedDemandId]
  );
  const packet = useMemo(() => buildDecisionPacket(selectedDemand), [selectedDemand]);
  const committee = selectedDemand?.committee_inputs ?? {};
  const selectedOutcome = outcomeOption(sponsorOutcome);
  const selectedOutcomeColors = toneColors(selectedOutcome.tone);

  async function loadBacklog(highlightId?: string) {
    try {
      setLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as BacklogResponse;
      const decided = payload.demands.filter(hasCommitteeDecision);
      setDemands(payload.demands);
      const nextSelection = highlightId || selectedDemandId || decided[0]?.demand_id || "";
      setSelectedDemandId(nextSelection);
      setMessage(`Backlog cargado: ${payload.count} demandas. Paquetes disponibles: ${decided.length}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo cargar backlog: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBacklog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectDemand(demand: DemandRecord) {
    const sponsorOutcomeValue = asText(demand.committee_inputs?.sponsor_review_outcome, "");
    setSelectedDemandId(demand.demand_id);
    if (sponsorOutcomeOptions.some((option) => option.value === sponsorOutcomeValue)) {
      setSponsorOutcome(sponsorOutcomeValue as SponsorOutcome);
    } else {
      setSponsorOutcome("sponsor_acknowledged");
    }
    setSponsorName(asText(demand.committee_inputs?.sponsor_reviewed_by, "Sponsor Ejecutivo"));
    setSponsorComment(asText(demand.committee_inputs?.sponsor_review_comment, "Revisión ejecutiva realizada sobre la evidencia presentada."));
    setMessage(`Paquete seleccionado: ${demand.demand_id}`);
  }

  async function recordSponsorOutcome() {
    if (!selectedDemand) {
      setMessage("Selecciona una demanda antes de registrar revisión sponsor.");
      return;
    }
    if (sponsorComment.trim().length < 10) {
      setMessage("Agrega un comentario mínimo para dejar trazabilidad ejecutiva.");
      return;
    }

    try {
      setSaving(true);
      const reviewedAt = new Date().toISOString();
      const response = await fetch("/api/demands/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demand_id: selectedDemand.demand_id,
          committee_inputs: {
            sponsor_review_outcome: sponsorOutcome,
            sponsor_review_label: selectedOutcome.label,
            sponsor_review_comment: sponsorComment.trim(),
            sponsor_reviewed_by: sponsorName.trim() || "Sponsor Ejecutivo",
            sponsor_reviewed_at: reviewedAt,
            sponsor_review_version: "sponsor-review-v1.0"
          },
          actor: sponsorName.trim() || "Sponsor Ejecutivo",
          comment: `Sponsor review registrado: ${sponsorOutcome}. ${sponsorComment.trim()}`
        })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const updatedDemand = JSON.parse(text) as DemandRecord;
      setDemands((items) => items.map((item) => (item.demand_id === updatedDemand.demand_id ? updatedDemand : item)));
      setMessage(`Resultado sponsor registrado: ${selectedOutcome.label}.`);
      await loadBacklog(updatedDemand.demand_id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo registrar revisión sponsor: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 22 }}>
        <header className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#991b1b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Sponsor review</h1>
            <p style={{ margin: 0, maxWidth: 780, color: "#475467", fontSize: 17 }}>
              Vista ejecutiva para revisar paquetes de decisión, guardar salida PDF y registrar el resultado del sponsor.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid #d0d5dd", background: "white", fontWeight: 800 }}>
              {loading ? "Cargando..." : "Sincronizar"}
            </button>
            <button onClick={() => window.print()} disabled={!selectedDemand} style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 800 }}>
              Imprimir / guardar PDF
            </button>
            <button
              onClick={() => selectedDemand && downloadMarkdown(`atlas-decision-packet-${selectedDemand.demand_id}.md`, packet)}
              disabled={!selectedDemand}
              style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid #991b1b", background: "#991b1b", color: "white", fontWeight: 800 }}
            >
              Descargar Markdown
            </button>
          </div>
        </header>

        <p className="no-print" style={{ padding: 14, borderRadius: 16, background: "#eef4ff", color: "#3538cd", margin: 0, fontWeight: 800 }}>{message}</p>

        <section className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          <article style={{ padding: 18, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Decididas</span>
            <strong style={{ display: "block", fontSize: 30 }}>{decidedDemands.length}</strong>
          </article>
          <article style={{ padding: 18, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Con sponsor review</span>
            <strong style={{ display: "block", fontSize: 30 }}>{decidedDemands.filter(hasSponsorReview).length}</strong>
          </article>
          <article style={{ padding: 18, borderRadius: 20, background: selectedOutcomeColors.bg, border: `1px solid ${selectedOutcomeColors.border}` }}>
            <span style={{ color: selectedOutcomeColors.text, fontWeight: 700 }}>Resultado actual</span>
            <strong style={{ display: "block", fontSize: 18, marginTop: 8 }}>{hasSponsorReview(selectedDemand) ? asText(committee.sponsor_review_label, labelize(asText(committee.sponsor_review_outcome))) : "Pendiente sponsor"}</strong>
          </article>
          <article style={{ padding: 18, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Última actualización</span>
            <strong style={{ display: "block", fontSize: 18, marginTop: 8 }}>{formatDate(selectedDemand?.updated_at)}</strong>
          </article>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18, alignItems: "start" }}>
          <aside className="no-print" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Paquetes disponibles</h2>
            {decidedDemands.length === 0 ? (
              <article style={{ padding: 18, borderRadius: 18, background: "white", border: "1px solid #eaecf0" }}>
                Aún no hay demandas con decisión de comité.
              </article>
            ) : (
              decidedDemands.map((demand) => (
                <button
                  key={demand.demand_id}
                  onClick={() => selectDemand(demand)}
                  style={{
                    textAlign: "left",
                    padding: 16,
                    borderRadius: 18,
                    background: selectedDemand?.demand_id === demand.demand_id ? "#111827" : "white",
                    color: selectedDemand?.demand_id === demand.demand_id ? "white" : "#101828",
                    border: "1px solid #eaecf0",
                    cursor: "pointer"
                  }}
                >
                  <strong style={{ display: "block" }}>{demand.request.title}</strong>
                  <small>{demand.demand_id}</small>
                  <span style={{ display: "block", marginTop: 8 }}>{labelize(asText(demand.committee_inputs?.committee_final_decision, demand.decision))}</span>
                  <em style={{ display: "block", marginTop: 6, color: selectedDemand?.demand_id === demand.demand_id ? "#d0d5dd" : "#667085" }}>
                    {hasSponsorReview(demand) ? `Sponsor: ${asText(demand.committee_inputs?.sponsor_review_label, labelize(asText(demand.committee_inputs?.sponsor_review_outcome)))}` : "Sponsor pendiente"}
                  </em>
                </button>
              ))
            )}
          </aside>

          <section style={{ display: "grid", gap: 18 }}>
            <article className="no-print" style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Resultado sponsor</h2>
              {!selectedDemand ? (
                <p>Selecciona una demanda con decisión de comité para registrar resultado sponsor.</p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                    Sponsor / revisor ejecutivo
                    <input value={sponsorName} onChange={(event) => setSponsorName(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd" }} />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                    {sponsorOutcomeOptions.map((option) => {
                      const colors = toneColors(option.tone);
                      const selected = sponsorOutcome === option.value;
                      return (
                        <label key={option.value} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, padding: 14, borderRadius: 16, border: selected ? `2px solid ${colors.text}` : "1px solid #d0d5dd", background: selected ? colors.bg : "#ffffff", cursor: "pointer" }}>
                          <input type="radio" name="sponsorOutcome" value={option.value} checked={selected} onChange={(event) => setSponsorOutcome(event.target.value as SponsorOutcome)} />
                          <span>
                            <strong>{option.label}</strong>
                            <small style={{ display: "block", color: "#667085", marginTop: 4 }}>{option.helper}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                    Comentario ejecutivo
                    <textarea rows={4} value={sponsorComment} onChange={(event) => setSponsorComment(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", fontFamily: "inherit" }} />
                  </label>

                  <button
                    onClick={() => void recordSponsorOutcome()}
                    disabled={saving || !selectedDemand || sponsorComment.trim().length < 10}
                    style={{ padding: "14px 18px", borderRadius: 16, border: "1px solid #111827", background: saving || sponsorComment.trim().length < 10 ? "#98a2b3" : "#111827", color: "white", fontWeight: 900 }}
                  >
                    {saving ? "Registrando..." : "Registrar resultado sponsor"}
                  </button>
                </div>
              )}
            </article>

            <article id="decision-packet" style={{ padding: 30, borderRadius: 28, background: "white", border: "1px solid #eaecf0", boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)" }}>
              {!selectedDemand ? (
                <p>Selecciona una demanda con decisión de comité.</p>
              ) : (
                <div style={{ display: "grid", gap: 24 }}>
                  <header style={{ borderBottom: "1px solid #eaecf0", paddingBottom: 18 }}>
                    <p style={{ margin: 0, color: "#991b1b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>Paquete de decisión</p>
                    <h2 style={{ margin: "8px 0", fontSize: 32 }}>{selectedDemand.request.title}</h2>
                    <p style={{ margin: 0, color: "#475467" }}>{selectedDemand.request.description}</p>
                  </header>

                  <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                    <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}><strong>ID</strong><br />{selectedDemand.demand_id}</div>
                    <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}><strong>Área</strong><br />{selectedDemand.request.requester_area}</div>
                    <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}><strong>Dominio</strong><br />{selectedDemand.request.domain_hint || "No definido"}</div>
                    <div style={{ padding: 14, borderRadius: 16, background: "#f9fafb" }}><strong>Estado</strong><br />{labelize(selectedDemand.status)}</div>
                  </section>

                  <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <article style={{ padding: 20, borderRadius: 20, border: "1px solid #eaecf0" }}>
                      <h3 style={{ marginTop: 0 }}>Decisión comité</h3>
                      <p><strong>Recomendación previa:</strong> {labelize(asText(committee.committee_recommendation, selectedDemand.committee?.suggested_decision ?? "pending_committee_recommendation"))}</p>
                      <p><strong>Decisión final:</strong> {labelize(asText(committee.committee_final_decision, selectedDemand.decision))}</p>
                      <p><strong>Riesgo:</strong> {labelize(asText(committee.committee_risk_level, "medium"))}</p>
                      <p><strong>Fecha:</strong> {formatDate(asText(committee.committee_decision_recorded_at, selectedDemand.updated_at))}</p>
                    </article>

                    <article style={{ padding: 20, borderRadius: 20, border: `1px solid ${selectedOutcomeColors.border}`, background: hasSponsorReview(selectedDemand) ? selectedOutcomeColors.bg : "#f9fafb" }}>
                      <h3 style={{ marginTop: 0 }}>Resultado sponsor</h3>
                      <p><strong>Resultado:</strong> {hasSponsorReview(selectedDemand) ? asText(committee.sponsor_review_label, labelize(asText(committee.sponsor_review_outcome))) : "Pendiente"}</p>
                      <p><strong>Revisor:</strong> {asText(committee.sponsor_reviewed_by, "Pendiente")}</p>
                      <p><strong>Fecha:</strong> {formatDate(asText(committee.sponsor_reviewed_at, ""))}</p>
                      <p><strong>Comentario:</strong> {asText(committee.sponsor_review_comment, "Pendiente de comentarios.")}</p>
                    </article>
                  </section>

                  <section style={{ display: "grid", gap: 12 }}>
                    <article style={{ padding: 20, borderRadius: 20, border: "1px solid #eaecf0" }}>
                      <h3 style={{ marginTop: 0 }}>Justificación del comité</h3>
                      <p>{asText(committee.committee_reason, "No definido")}</p>
                    </article>
                    <article style={{ padding: 20, borderRadius: 20, border: "1px solid #eaecf0" }}>
                      <h3 style={{ marginTop: 0 }}>Condiciones</h3>
                      <p>{asText(committee.committee_conditions, "Sin condiciones registradas.")}</p>
                    </article>
                  </section>

                  <section>
                    <h3>Línea de tiempo</h3>
                    <div style={{ display: "grid", gap: 10 }}>
                      {[...selectedDemand.events]
                        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
                        .slice(0, 8)
                        .map((event) => (
                          <article key={event.event_id ?? `${event.timestamp}-${event.actor}`} style={{ padding: 14, borderRadius: 16, background: "#f9fafb", border: "1px solid #eaecf0" }}>
                            <strong>{formatDate(event.timestamp)} · {event.actor}</strong>
                            <p style={{ margin: "6px 0" }}>{event.comment}</p>
                            <small>{labelize(event.from_status)} → {labelize(event.to_status)} · {labelize(event.decision)}</small>
                          </article>
                        ))}
                    </div>
                  </section>
                </div>
              )}
            </article>
          </section>
        </section>
      </section>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; background: white !important; }
          #decision-packet { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </main>
  );
}
