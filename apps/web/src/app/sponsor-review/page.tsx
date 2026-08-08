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

type PacketStatus = "ready" | "missing_decision" | "missing_reason";

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

function packetStatus(demand: DemandRecord | null): PacketStatus {
  if (!demand || !hasCommitteeDecision(demand)) return "missing_decision";
  if (!asText(demand.committee_inputs?.committee_reason, "").trim()) return "missing_reason";
  return "ready";
}

function statusCopy(status: PacketStatus) {
  if (status === "ready") return "Paquete listo para revisión ejecutiva";
  if (status === "missing_reason") return "Falta justificación final del comité";
  return "La demanda aún no tiene decisión formal de comité";
}

function buildDecisionPacket(demand: DemandRecord | null) {
  if (!demand) return "Selecciona una demanda para generar el paquete de decisión.";
  const committee = demand.committee_inputs ?? {};
  const roles = asTextArray(committee.committee_decision_recorded_roles).join(", ") || "No definido";
  const gaps = [
    ...demand.policy_gaps.map((gap) => `Política: ${gap}`),
    ...demand.architecture_gaps.map((gap) => `Arquitectura: ${gap}`),
    ...demand.finops_gaps.map((gap) => `FinOps: ${gap}`)
  ];
  const timeline = [...demand.events]
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .map((event) => `- ${formatDate(event.timestamp)} | ${event.actor} | ${labelize(event.from_status)} → ${labelize(event.to_status)} | ${event.comment}`)
    .join("\n") || "- Sin eventos registrados.";

  return `# Paquete de decisión · ATLAS DataGob\n\n## 1. Identificación\n- Demanda: ${demand.demand_id}\n- Título: ${demand.request.title}\n- Área solicitante: ${demand.request.requester_area}\n- Rol solicitante: ${demand.request.requester_role}\n- Dominio: ${demand.request.domain_hint || "No definido"}\n- Consumo objetivo: ${demand.request.target_consumption || "No definido"}\n\n## 2. Descripción ejecutiva\n${demand.request.description}\n\n## 3. Decisión del Comité Operativo\n- Recomendación previa: ${labelize(asText(committee.committee_recommendation, demand.committee?.suggested_decision ?? "pending_committee_recommendation"))}\n- Decisión final: ${labelize(asText(committee.committee_final_decision, demand.decision))}\n- Estado final: ${labelize(asText(committee.committee_final_status, demand.status))}\n- Riesgo comité: ${labelize(asText(committee.committee_risk_level, "medium"))}\n- Actor: ${asText(committee.committee_decision_recorded_by, "Comité Operativo")}\n- Roles: ${roles}\n- Fecha: ${formatDate(asText(committee.committee_decision_recorded_at, demand.updated_at))}\n\n## 4. Justificación\n${asText(committee.committee_reason, "No definido")}\n\n## 5. Condiciones y próximos pasos\n${asText(committee.committee_conditions, "Sin condiciones registradas.")}\n\n## 6. Brechas registradas\n${gaps.length ? gaps.map((gap) => `- ${gap}`).join("\n") : "- Sin brechas registradas."}\n\n## 7. Línea de tiempo\n${timeline}\n\n## 8. Criterio de uso\nEste paquete consolida la evidencia disponible para revisión de sponsor, comité, auditoría o seguimiento de portafolio.\n`;
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
  const [message, setMessage] = useState("Cargando paquetes de decisión...");

  const decidedDemands = useMemo(() => demands.filter(hasCommitteeDecision), [demands]);
  const selectedDemand = useMemo(
    () => decidedDemands.find((item) => item.demand_id === selectedDemandId) ?? decidedDemands[0] ?? null,
    [decidedDemands, selectedDemandId]
  );
  const packet = useMemo(() => buildDecisionPacket(selectedDemand), [selectedDemand]);
  const readiness = packetStatus(selectedDemand);
  const committee = selectedDemand?.committee_inputs ?? {};

  async function loadBacklog() {
    try {
      setLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as BacklogResponse;
      const decided = payload.demands.filter(hasCommitteeDecision);
      setDemands(payload.demands);
      setSelectedDemandId((current) => current || decided[0]?.demand_id || "");
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
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 22 }}>
        <header className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#991b1b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Sponsor review</h1>
            <p style={{ margin: 0, maxWidth: 780, color: "#475467", fontSize: 17 }}>
              Vista ejecutiva para revisar paquetes de decisión del Comité Operativo y preparar salida imprimible/PDF.
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

        <section className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          <article style={{ padding: 18, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Decididas</span>
            <strong style={{ display: "block", fontSize: 30 }}>{decidedDemands.length}</strong>
          </article>
          <article style={{ padding: 18, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Estado del paquete</span>
            <strong style={{ display: "block", fontSize: 18, marginTop: 8 }}>{statusCopy(readiness)}</strong>
          </article>
          <article style={{ padding: 18, borderRadius: 20, background: "white", border: "1px solid #eaecf0" }}>
            <span style={{ color: "#667085", fontWeight: 700 }}>Última actualización</span>
            <strong style={{ display: "block", fontSize: 18, marginTop: 8 }}>{formatDate(selectedDemand?.updated_at)}</strong>
          </article>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18, alignItems: "start" }}>
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
                  onClick={() => setSelectedDemandId(demand.demand_id)}
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
                </button>
              ))
            )}
          </aside>

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
                    <h3 style={{ marginTop: 0 }}>Decisión</h3>
                    <p><strong>Recomendación previa:</strong> {labelize(asText(committee.committee_recommendation, selectedDemand.committee?.suggested_decision ?? "pending_committee_recommendation"))}</p>
                    <p><strong>Decisión final:</strong> {labelize(asText(committee.committee_final_decision, selectedDemand.decision))}</p>
                    <p><strong>Riesgo:</strong> {labelize(asText(committee.committee_risk_level, "medium"))}</p>
                    <p><strong>Fecha:</strong> {formatDate(asText(committee.committee_decision_recorded_at, selectedDemand.updated_at))}</p>
                  </article>

                  <article style={{ padding: 20, borderRadius: 20, border: "1px solid #eaecf0" }}>
                    <h3 style={{ marginTop: 0 }}>Trazabilidad</h3>
                    <p><strong>Actor:</strong> {asText(committee.committee_decision_recorded_by, "Comité Operativo")}</p>
                    <p><strong>Roles:</strong> {asTextArray(committee.committee_decision_recorded_roles).join(", ") || "No definido"}</p>
                    <p><strong>Eventos:</strong> {selectedDemand.events.length}</p>
                    <p><strong>Readiness:</strong> {statusCopy(readiness)}</p>
                  </article>
                </section>

                <section style={{ display: "grid", gap: 14 }}>
                  <article style={{ padding: 20, borderRadius: 20, background: "#f9fafb" }}>
                    <h3 style={{ marginTop: 0 }}>Justificación</h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>{asText(committee.committee_reason, "No definido")}</p>
                  </article>
                  <article style={{ padding: 20, borderRadius: 20, background: "#f9fafb" }}>
                    <h3 style={{ marginTop: 0 }}>Condiciones</h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>{asText(committee.committee_conditions, "Sin condiciones registradas.")}</p>
                  </article>
                </section>

                <section>
                  <h3>Timeline resumido</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[...selectedDemand.events].slice(-6).reverse().map((event) => (
                      <div key={event.event_id ?? `${event.timestamp}-${event.type}`} style={{ padding: 14, borderRadius: 16, border: "1px solid #eaecf0" }}>
                        <strong>{formatDate(event.timestamp)} · {event.actor}</strong>
                        <p style={{ margin: "6px 0" }}>{labelize(event.from_status)} → {labelize(event.to_status)}</p>
                        <small>{event.comment}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <details className="no-print" style={{ border: "1px solid #eaecf0", borderRadius: 18, padding: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 900 }}>Ver Markdown generado</summary>
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 14, background: "#101828", color: "#f9fafb", padding: 18, borderRadius: 16, overflowX: "auto" }}>{packet}</pre>
                </details>
              </div>
            )}
          </article>
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
