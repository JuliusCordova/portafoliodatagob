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
type QueueFilter = "all" | "overdue" | "due_soon" | "pending_sponsor" | "adjustment" | "observed" | "paused" | "acknowledged";
type QueueTone = "success" | "warning" | "error" | "info" | "neutral";

type FollowUpItem = {
  demand: DemandRecord;
  sponsorOutcome: string;
  sponsorLabel: string;
  owner: string;
  baseDate: Date;
  dueDate: Date;
  daysRemaining: number;
  slaDays: number;
  queueState: QueueFilter;
  tone: QueueTone;
  nextAction: string;
  guardrail: string;
  severity: number;
};

const filterLabels: Record<QueueFilter, string> = {
  all: "Todas",
  overdue: "Fuera de SLA",
  due_soon: "Vencen pronto",
  pending_sponsor: "Pendiente sponsor",
  adjustment: "Ajuste requerido",
  observed: "Observadas",
  paused: "Pausadas",
  acknowledged: "Con visto bueno"
};

function asText(value: unknown, fallback = "No definido") {
  return typeof value === "string" && value.trim().length ? value : fallback;
}

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function formatDate(value: Date | string | undefined) {
  if (!value) return "Sin fecha";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    return String(value);
  }
}

function hasCommitteeDecision(demand: DemandRecord) {
  return Boolean(demand.committee_inputs?.committee_final_decision || demand.validation_state?.committee_decision_recorded);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function daysUntil(date: Date, now: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((date.getTime() - now.getTime()) / msPerDay);
}

function parseDate(value: unknown, fallback: string) {
  const candidate = asText(value, fallback);
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

function toneStyle(tone: QueueTone) {
  if (tone === "success") return { border: "#abefc6", bg: "#ecfdf3", text: "#067647" };
  if (tone === "warning") return { border: "#fedf89", bg: "#fffaeb", text: "#b54708" };
  if (tone === "error") return { border: "#fecdca", bg: "#fef3f2", text: "#b42318" };
  if (tone === "info") return { border: "#b2ddff", bg: "#eff8ff", text: "#175cd3" };
  return { border: "#eaecf0", bg: "#f9fafb", text: "#475467" };
}

function followUpProfile(outcome: string) {
  if (outcome === "sponsor_acknowledged") {
    return {
      label: "Visto bueno",
      slaDays: 0,
      state: "acknowledged" as QueueFilter,
      tone: "success" as QueueTone,
      nextAction: "Pasar a priorización o ejecución según estado de portafolio.",
      guardrail: "No requiere escalamiento sponsor; mantener evidencia disponible."
    };
  }
  if (outcome === "sponsor_adjustment_requested") {
    return {
      label: "Ajuste requerido",
      slaDays: 2,
      state: "adjustment" as QueueFilter,
      tone: "warning" as QueueTone,
      nextAction: "Asignar owner de reformulación y actualizar condiciones antes de volver a sponsor.",
      guardrail: "No avanzar a ejecución mientras exista ajuste sponsor pendiente."
    };
  }
  if (outcome === "sponsor_paused") {
    return {
      label: "Pausa ejecutiva",
      slaDays: 7,
      state: "paused" as QueueFilter,
      tone: "error" as QueueTone,
      nextAction: "Revisar continuidad con sponsor o cerrar temporalmente la demanda.",
      guardrail: "No consumir capacidad de delivery hasta levantar la pausa ejecutiva."
    };
  }
  if (outcome === "sponsor_observation") {
    return {
      label: "Con observaciones",
      slaDays: 3,
      state: "observed" as QueueFilter,
      tone: "info" as QueueTone,
      nextAction: "Responder observaciones y confirmar si impactan alcance, riesgo o prioridad.",
      guardrail: "Mantener seguimiento activo hasta cerrar observaciones."
    };
  }
  return {
    label: "Pendiente sponsor",
    slaDays: 2,
    state: "pending_sponsor" as QueueFilter,
    tone: "neutral" as QueueTone,
    nextAction: "Solicitar revisión sponsor del paquete de decisión.",
    guardrail: "No considerar el paquete cerrado hasta registrar resultado sponsor."
  };
}

function buildFollowUpItem(demand: DemandRecord, now: Date): FollowUpItem {
  const committee = demand.committee_inputs ?? {};
  const sponsorOutcome = asText(committee.sponsor_review_outcome, "pending_sponsor");
  const profile = followUpProfile(sponsorOutcome);
  const baseDate = sponsorOutcome === "pending_sponsor"
    ? parseDate(committee.committee_decision_recorded_at, demand.updated_at)
    : parseDate(committee.sponsor_reviewed_at, demand.updated_at);
  const dueDate = addDays(baseDate, profile.slaDays);
  const remaining = profile.state === "acknowledged" ? 999 : daysUntil(dueDate, now);
  const overdue = remaining < 0;
  const dueSoon = remaining >= 0 && remaining <= 1 && profile.state !== "acknowledged";
  const queueState: QueueFilter = overdue ? "overdue" : dueSoon ? "due_soon" : profile.state;
  const tone: QueueTone = overdue ? "error" : dueSoon ? "warning" : profile.tone;
  const severity = overdue ? 1 : dueSoon ? 2 : profile.state === "adjustment" ? 3 : profile.state === "paused" ? 4 : profile.state === "observed" ? 5 : profile.state === "pending_sponsor" ? 6 : 9;

  return {
    demand,
    sponsorOutcome,
    sponsorLabel: asText(committee.sponsor_review_label, profile.label),
    owner: asText(committee.sponsor_reviewed_by, "Portfolio / Sponsor pendiente"),
    baseDate,
    dueDate,
    daysRemaining: remaining,
    slaDays: profile.slaDays,
    queueState,
    tone,
    nextAction: asText(committee.sponsor_review_next_action, profile.nextAction),
    guardrail: asText(committee.sponsor_review_guardrail, profile.guardrail),
    severity
  };
}

function slaLabel(item: FollowUpItem) {
  if (item.queueState === "acknowledged") return "Cerrado";
  if (item.daysRemaining < 0) return `${Math.abs(item.daysRemaining)} día(s) vencido`;
  if (item.daysRemaining === 0) return "Vence hoy";
  if (item.daysRemaining === 1) return "Vence mañana";
  return `${item.daysRemaining} día(s) restantes`;
}

export default function SponsorFollowUpPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Cargando cola de seguimiento sponsor...");
  const [filter, setFilter] = useState<QueueFilter>("all");

  const now = useMemo(() => new Date(), []);
  const queue = useMemo(
    () => demands.filter(hasCommitteeDecision).map((demand) => buildFollowUpItem(demand, now)).sort((left, right) => left.severity - right.severity || left.dueDate.getTime() - right.dueDate.getTime()),
    [demands, now]
  );
  const visibleQueue = useMemo(() => queue.filter((item) => filter === "all" || item.queueState === filter || (filter === "adjustment" && item.sponsorOutcome === "sponsor_adjustment_requested") || (filter === "observed" && item.sponsorOutcome === "sponsor_observation") || (filter === "paused" && item.sponsorOutcome === "sponsor_paused") || (filter === "acknowledged" && item.sponsorOutcome === "sponsor_acknowledged") || (filter === "pending_sponsor" && item.sponsorOutcome === "pending_sponsor")), [queue, filter]);

  const counts = useMemo(() => ({
    all: queue.length,
    overdue: queue.filter((item) => item.queueState === "overdue").length,
    due_soon: queue.filter((item) => item.queueState === "due_soon").length,
    pending_sponsor: queue.filter((item) => item.sponsorOutcome === "pending_sponsor").length,
    adjustment: queue.filter((item) => item.sponsorOutcome === "sponsor_adjustment_requested").length,
    observed: queue.filter((item) => item.sponsorOutcome === "sponsor_observation").length,
    paused: queue.filter((item) => item.sponsorOutcome === "sponsor_paused").length,
    acknowledged: queue.filter((item) => item.sponsorOutcome === "sponsor_acknowledged").length
  }), [queue]);

  async function loadBacklog() {
    try {
      setLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as BacklogResponse;
      setDemands(payload.demands);
      setMessage(`Backlog cargado: ${payload.count} demandas. Cola sponsor: ${payload.demands.filter(hasCommitteeDecision).length}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo cargar seguimiento sponsor: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBacklog();
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 22 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#991b1b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Sponsor SLA & follow-up queue</h1>
            <p style={{ margin: 0, maxWidth: 820, color: "#475467", fontSize: 17 }}>
              Cola ejecutiva para controlar paquetes de decisión pendientes, vencidos, observados, ajustados o pausados por sponsor.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a href="/sponsor-review" style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid #d0d5dd", background: "white", color: "#101828", textDecoration: "none", fontWeight: 800 }}>
              Ir a Sponsor review
            </a>
            <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid #111827", background: loading ? "#98a2b3" : "#111827", color: "white", fontWeight: 800 }}>
              {loading ? "Cargando..." : "Sincronizar"}
            </button>
          </div>
        </header>

        <p style={{ padding: 14, borderRadius: 16, background: "#eef4ff", color: "#3538cd", margin: 0, fontWeight: 800 }}>{message}</p>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          {([
            ["all", "Paquetes"],
            ["overdue", "Fuera de SLA"],
            ["due_soon", "Vencen pronto"],
            ["pending_sponsor", "Pendiente sponsor"],
            ["adjustment", "Ajuste requerido"],
            ["observed", "Observadas"],
            ["paused", "Pausadas"],
            ["acknowledged", "Visto bueno"]
          ] as Array<[QueueFilter, string]>).map(([key, label]) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: 18,
                  borderRadius: 20,
                  background: active ? "#111827" : "white",
                  color: active ? "white" : "#101828",
                  border: "1px solid #eaecf0",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <span style={{ color: active ? "#d0d5dd" : "#667085", fontWeight: 700 }}>{label}</span>
                <strong style={{ display: "block", fontSize: 30 }}>{counts[key]}</strong>
              </button>
            );
          })}
        </section>

        <section style={{ padding: 22, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Cola de seguimiento</h2>
              <p style={{ margin: "6px 0 0", color: "#667085" }}>Filtro actual: {filterLabels[filter]} · {visibleQueue.length} resultado(s)</p>
            </div>
            <a href="/sponsor-review" style={{ color: "#991b1b", fontWeight: 900 }}>Registrar resultado sponsor →</a>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {visibleQueue.length === 0 ? (
              <article style={{ padding: 18, borderRadius: 18, background: "#f9fafb", border: "1px dashed #d0d5dd" }}>
                No hay paquetes para este filtro.
              </article>
            ) : (
              visibleQueue.map((item) => {
                const colors = toneStyle(item.tone);
                const committee = item.demand.committee_inputs ?? {};
                return (
                  <article key={item.demand.demand_id} style={{ padding: 18, borderRadius: 22, border: `1px solid ${colors.border}`, background: colors.bg, display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1.2fr", gap: 16, alignItems: "start" }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 18 }}>{item.demand.request.title}</strong>
                      <span style={{ color: "#667085" }}>{item.demand.demand_id} · {item.demand.request.requester_area}</span>
                      <p style={{ margin: "10px 0 0", color: "#475467" }}>{item.demand.request.description}</p>
                    </div>
                    <div>
                      <span style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "white", color: colors.text, fontWeight: 900 }}>{item.sponsorLabel}</span>
                      <p style={{ margin: "10px 0 0" }}><strong>SLA:</strong> {slaLabel(item)}</p>
                      <p style={{ margin: "6px 0 0" }}><strong>Vence:</strong> {item.queueState === "acknowledged" ? "Cerrado" : formatDate(item.dueDate)}</p>
                      <p style={{ margin: "6px 0 0" }}><strong>Owner:</strong> {item.owner}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0 }}><strong>Próxima acción:</strong> {item.nextAction}</p>
                      <p style={{ margin: "10px 0 0" }}><strong>Guardrail:</strong> {item.guardrail}</p>
                      <small style={{ display: "block", marginTop: 10, color: "#667085" }}>
                        Comité: {labelize(asText(committee.committee_final_decision, item.demand.decision))} · Estado: {labelize(item.demand.status)}
                      </small>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
