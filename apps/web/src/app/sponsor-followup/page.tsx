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
type FollowupFilter = "all" | "pending_sponsor" | "overdue" | "due_soon" | "adjustment" | "observation" | "paused" | "acknowledged" | "assigned";

type FollowupSignal = {
  status: FollowupFilter;
  label: string;
  tone: FeedbackTone;
  guardrail: string;
  nextAction: string;
  slaLabel: string;
  daysSinceAnchor: number;
  daysToSla: number;
  assigned: boolean;
};

const SLA_DAYS = 3;

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function asText(value: unknown, fallback = "No definido") {
  return typeof value === "string" && value.trim().length ? value : fallback;
}

function formatDate(value: string | undefined | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateOnly(value: string | undefined | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function dateInputValue(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function hasCommitteeDecision(demand: DemandRecord) {
  return Boolean(demand.committee_inputs?.committee_final_decision || demand.validation_state?.committee_decision_recorded);
}

function hasSponsorReview(demand: DemandRecord) {
  return Boolean(demand.committee_inputs?.sponsor_review_outcome);
}

function toneColors(tone: FeedbackTone) {
  if (tone === "success") return { border: "#abefc6", bg: "#ecfdf3", text: "#067647", soft: "#dcfae6" };
  if (tone === "warning") return { border: "#fedf89", bg: "#fffaeb", text: "#b54708", soft: "#fef0c7" };
  if (tone === "error") return { border: "#fecdca", bg: "#fef3f2", text: "#b42318", soft: "#fee4e2" };
  return { border: "#b2ddff", bg: "#eff8ff", text: "#175cd3", soft: "#d1e9ff" };
}

function reviewAnchor(demand: DemandRecord) {
  const committee = demand.committee_inputs ?? {};
  return asText(committee.sponsor_reviewed_at, asText(committee.committee_decision_recorded_at, demand.updated_at));
}

function daysSince(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function followupSignal(demand: DemandRecord): FollowupSignal {
  const committee = demand.committee_inputs ?? {};
  const outcome = asText(committee.sponsor_review_outcome, "pending_sponsor");
  const anchor = reviewAnchor(demand);
  const age = daysSince(anchor);
  const daysToSla = SLA_DAYS - age;
  const assigned = Boolean(committee.portfolio_followup_owner || committee.portfolio_followup_action);

  if (!hasSponsorReview(demand)) {
    return {
      status: "pending_sponsor",
      label: "Sponsor pendiente",
      tone: daysToSla < 0 ? "error" : daysToSla <= 1 ? "warning" : "info",
      guardrail: "Debe registrarse revisión sponsor antes de cerrar seguimiento ejecutivo.",
      nextAction: "Asignar responsable para contactar sponsor y completar revisión.",
      slaLabel: daysToSla < 0 ? `Fuera de SLA por ${Math.abs(daysToSla)} día(s)` : `SLA vence en ${daysToSla} día(s)`,
      daysSinceAnchor: age,
      daysToSla,
      assigned
    };
  }

  if (outcome === "sponsor_adjustment_requested") {
    return {
      status: "adjustment",
      label: "Ajuste requerido",
      tone: "warning",
      guardrail: "Debe existir dueño y fecha compromiso para reformular evidencia, alcance o condiciones.",
      nextAction: "Asignar owner de ajuste y acordar fecha de re-presentación al sponsor.",
      slaLabel: daysToSla < 0 ? `Fuera de SLA por ${Math.abs(daysToSla)} día(s)` : `SLA vence en ${daysToSla} día(s)`,
      daysSinceAnchor: age,
      daysToSla,
      assigned
    };
  }

  if (outcome === "sponsor_observation") {
    return {
      status: "observation",
      label: "Con observaciones",
      tone: "info",
      guardrail: "Las observaciones deben convertirse en una acción trazable de portafolio.",
      nextAction: "Registrar seguimiento y confirmar si las observaciones bloquean el avance.",
      slaLabel: daysToSla < 0 ? `Fuera de SLA por ${Math.abs(daysToSla)} día(s)` : `SLA vence en ${daysToSla} día(s)`,
      daysSinceAnchor: age,
      daysToSla,
      assigned
    };
  }

  if (outcome === "sponsor_paused") {
    return {
      status: "paused",
      label: "Pausa ejecutiva",
      tone: "error",
      guardrail: "La pausa requiere responsable, motivo y fecha de próxima revisión ejecutiva.",
      nextAction: "Asignar owner de seguimiento y definir checkpoint ejecutivo.",
      slaLabel: daysToSla < 0 ? `Fuera de SLA por ${Math.abs(daysToSla)} día(s)` : `SLA vence en ${daysToSla} día(s)`,
      daysSinceAnchor: age,
      daysToSla,
      assigned
    };
  }

  return {
    status: "acknowledged",
    label: "Visto bueno",
    tone: assigned ? "success" : "info",
    guardrail: "El visto bueno debe conectarse con la siguiente acción de portafolio o scoring.",
    nextAction: "Registrar acción de continuidad o confirmar cierre de seguimiento.",
    slaLabel: assigned ? "Seguimiento asignado" : "Pendiente de acción de continuidad",
    daysSinceAnchor: age,
    daysToSla,
    assigned
  };
}

function filterMatches(demand: DemandRecord, filter: FollowupFilter) {
  const signal = followupSignal(demand);
  if (filter === "all") return true;
  if (filter === "assigned") return signal.assigned;
  if (filter === "overdue") return signal.daysToSla < 0 && signal.status !== "acknowledged";
  if (filter === "due_soon") return signal.daysToSla >= 0 && signal.daysToSla <= 1 && signal.status !== "acknowledged";
  return signal.status === filter;
}

function priority(signal: FollowupSignal) {
  if (signal.daysToSla < 0 && signal.status !== "acknowledged") return 0;
  if (signal.status === "paused") return 1;
  if (signal.status === "adjustment") return 2;
  if (signal.status === "pending_sponsor") return 3;
  if (signal.status === "observation") return 4;
  if (!signal.assigned) return 5;
  return 9;
}

export default function SponsorFollowupPage() {
  const [demands, setDemands] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState("");
  const [filter, setFilter] = useState<FollowupFilter>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Cargando cola sponsor follow-up...");
  const [owner, setOwner] = useState("Portfolio Owner");
  const [dueDate, setDueDate] = useState(dateInputValue(3));
  const [action, setAction] = useState("Revisar paquete con sponsor y confirmar siguiente decisión de portafolio.");
  const [comment, setComment] = useState("Seguimiento registrado por portafolio para asegurar cierre del ciclo ejecutivo.");

  const decidedDemands = useMemo(() => demands.filter(hasCommitteeDecision), [demands]);
  const followupItems = useMemo(
    () =>
      decidedDemands
        .filter((demand) => filterMatches(demand, filter))
        .sort((left, right) => {
          const leftSignal = followupSignal(left);
          const rightSignal = followupSignal(right);
          return priority(leftSignal) - priority(rightSignal) || leftSignal.daysToSla - rightSignal.daysToSla;
        }),
    [decidedDemands, filter]
  );
  const selectedDemand = useMemo(
    () => followupItems.find((item) => item.demand_id === selectedDemandId) ?? followupItems[0] ?? decidedDemands[0] ?? null,
    [decidedDemands, followupItems, selectedDemandId]
  );
  const selectedSignal = selectedDemand ? followupSignal(selectedDemand) : null;
  const selectedColors = toneColors(selectedSignal?.tone ?? "info");

  const kpis = useMemo(() => {
    const signals = decidedDemands.map(followupSignal);
    return {
      total: decidedDemands.length,
      overdue: signals.filter((signal) => signal.daysToSla < 0 && signal.status !== "acknowledged").length,
      dueSoon: signals.filter((signal) => signal.daysToSla >= 0 && signal.daysToSla <= 1 && signal.status !== "acknowledged").length,
      pending: signals.filter((signal) => signal.status === "pending_sponsor").length,
      adjustment: signals.filter((signal) => signal.status === "adjustment").length,
      paused: signals.filter((signal) => signal.status === "paused").length,
      assigned: signals.filter((signal) => signal.assigned).length
    };
  }, [decidedDemands]);

  async function loadBacklog(highlightId?: string) {
    try {
      setLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as BacklogResponse;
      const decided = payload.demands.filter(hasCommitteeDecision);
      setDemands(payload.demands);
      setSelectedDemandId((current) => highlightId || current || decided[0]?.demand_id || "");
      setMessage(`Backlog cargado: ${payload.count} demandas. Cola follow-up: ${decided.length}.`);
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
    const committee = demand.committee_inputs ?? {};
    const signal = followupSignal(demand);
    setSelectedDemandId(demand.demand_id);
    setOwner(asText(committee.portfolio_followup_owner, "Portfolio Owner"));
    setDueDate(asText(committee.portfolio_followup_due_date, dateInputValue(signal.daysToSla > 0 ? signal.daysToSla : 2)));
    setAction(asText(committee.portfolio_followup_action, signal.nextAction));
    setComment(asText(committee.portfolio_followup_comment, "Seguimiento registrado por portafolio para asegurar cierre del ciclo ejecutivo."));
    setMessage(`Demanda seleccionada: ${demand.demand_id}`);
  }

  async function saveFollowup() {
    if (!selectedDemand || !selectedSignal) {
      setMessage("Selecciona una demanda antes de registrar seguimiento.");
      return;
    }
    if (owner.trim().length < 3 || action.trim().length < 10 || comment.trim().length < 10 || !dueDate) {
      setMessage("Completa responsable, fecha compromiso, acción y comentario para dejar trazabilidad suficiente.");
      return;
    }

    try {
      setSaving(true);
      const recordedAt = new Date().toISOString();
      const response = await fetch("/api/demands/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demand_id: selectedDemand.demand_id,
          committee_inputs: {
            portfolio_followup_owner: owner.trim(),
            portfolio_followup_due_date: dueDate,
            portfolio_followup_action: action.trim(),
            portfolio_followup_comment: comment.trim(),
            portfolio_followup_status: selectedSignal.status,
            portfolio_followup_sla_label: selectedSignal.slaLabel,
            portfolio_followup_guardrail: selectedSignal.guardrail,
            portfolio_followup_next_action: selectedSignal.nextAction,
            portfolio_followup_recorded_at: recordedAt,
            portfolio_followup_version: "portfolio-followup-v1.0"
          },
          actor: owner.trim(),
          comment: `Portfolio follow-up registrado: ${action.trim()}`
        })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const updatedDemand = JSON.parse(text) as DemandRecord;
      setDemands((items) => items.map((item) => (item.demand_id === updatedDemand.demand_id ? updatedDemand : item)));
      setMessage(`Seguimiento registrado para ${updatedDemand.demand_id}.`);
      await loadBacklog(updatedDemand.demand_id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error desconocido";
      setMessage(`No se pudo registrar seguimiento: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  const filters: { value: FollowupFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "overdue", label: "Fuera SLA" },
    { value: "due_soon", label: "Vencen pronto" },
    { value: "pending_sponsor", label: "Pendiente sponsor" },
    { value: "adjustment", label: "Ajuste" },
    { value: "observation", label: "Observadas" },
    { value: "paused", label: "Pausadas" },
    { value: "acknowledged", label: "Visto bueno" },
    { value: "assigned", label: "Asignadas" }
  ];

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#f8fafc", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 22 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#991b1b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>ATLAS DataGob</p>
            <h1 style={{ margin: "8px 0", fontSize: 40, lineHeight: 1.05 }}>Sponsor follow-up</h1>
            <p style={{ margin: 0, maxWidth: 860, color: "#475467", fontSize: 17 }}>
              Cola ejecutiva para gestionar SLA, responsables y próximas acciones posteriores a la revisión sponsor.
            </p>
          </div>
          <button onClick={() => void loadBacklog()} disabled={loading} style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid #d0d5dd", background: "white", fontWeight: 800 }}>
            {loading ? "Cargando..." : "Sincronizar"}
          </button>
        </header>

        <p style={{ padding: 14, borderRadius: 16, background: "#eef4ff", color: "#3538cd", margin: 0, fontWeight: 800 }}>{message}</p>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 12 }}>
          {[
            ["Paquetes", kpis.total, "info"],
            ["Fuera SLA", kpis.overdue, "error"],
            ["Vencen pronto", kpis.dueSoon, "warning"],
            ["Pend. sponsor", kpis.pending, "info"],
            ["Ajuste", kpis.adjustment, "warning"],
            ["Pausadas", kpis.paused, "error"],
            ["Asignadas", kpis.assigned, "success"]
          ].map(([label, value, tone]) => {
            const colors = toneColors(tone as FeedbackTone);
            return (
              <article key={label as string} style={{ padding: 16, borderRadius: 20, background: colors.bg, border: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.text, fontWeight: 800 }}>{label}</span>
                <strong style={{ display: "block", fontSize: 28 }}>{value}</strong>
              </article>
            );
          })}
        </section>

        <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: filter === item.value ? "1px solid #991b1b" : "1px solid #d0d5dd",
                background: filter === item.value ? "#991b1b" : "white",
                color: filter === item.value ? "white" : "#344054",
                fontWeight: 800
              }}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, alignItems: "start" }}>
          <article style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Cola de portafolio</h2>
            {followupItems.length === 0 ? (
              <div style={{ padding: 22, borderRadius: 22, background: "white", border: "1px solid #eaecf0" }}>No hay demandas para el filtro seleccionado.</div>
            ) : (
              followupItems.map((demand) => {
                const signal = followupSignal(demand);
                const colors = toneColors(signal.tone);
                const committee = demand.committee_inputs ?? {};
                const selected = selectedDemand?.demand_id === demand.demand_id;
                return (
                  <button
                    key={demand.demand_id}
                    onClick={() => selectDemand(demand)}
                    style={{ textAlign: "left", padding: 18, borderRadius: 22, border: selected ? "2px solid #111827" : `1px solid ${colors.border}`, background: selected ? "#111827" : "white", color: selected ? "white" : "#101828", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: 18 }}>{demand.request.title}</strong>
                        <small>{demand.demand_id} · {demand.request.requester_area}</small>
                        <p style={{ margin: "8px 0 0", color: selected ? "#d0d5dd" : "#475467" }}>{signal.guardrail}</p>
                      </div>
                      <span style={{ padding: "6px 10px", borderRadius: 999, background: selected ? "#344054" : colors.bg, color: selected ? "white" : colors.text, fontWeight: 900 }}>{signal.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                      <small><strong>SLA:</strong> {signal.slaLabel}</small>
                      <small><strong>Owner:</strong> {asText(committee.portfolio_followup_owner, "Sin asignar")}</small>
                      <small><strong>Compromiso:</strong> {formatDateOnly(asText(committee.portfolio_followup_due_date, ""))}</small>
                    </div>
                  </button>
                );
              })
            )}
          </article>

          <aside style={{ display: "grid", gap: 16 }}>
            <article style={{ padding: 24, borderRadius: 24, background: selectedColors.bg, border: `1px solid ${selectedColors.border}` }}>
              <h2 style={{ marginTop: 0, color: selectedColors.text }}>Guardrail de seguimiento</h2>
              {selectedDemand && selectedSignal ? (
                <>
                  <p><strong>{selectedSignal.label}</strong> · {selectedSignal.slaLabel}</p>
                  <p>{selectedSignal.guardrail}</p>
                  <p><strong>Próxima acción:</strong> {selectedSignal.nextAction}</p>
                </>
              ) : (
                <p>Selecciona una demanda para ver guardrail.</p>
              )}
            </article>

            <article style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
              <h2 style={{ marginTop: 0 }}>Asignar seguimiento</h2>
              {!selectedDemand ? (
                <p>Selecciona una demanda de la cola.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <p style={{ margin: 0, color: "#475467" }}>{selectedDemand.demand_id} · {selectedDemand.request.title}</p>
                  <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                    Responsable
                    <input value={owner} onChange={(event) => setOwner(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                    Fecha compromiso
                    <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                    Acción de portafolio
                    <textarea rows={3} value={action} onChange={(event) => setAction(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", fontFamily: "inherit" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                    Comentario
                    <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d0d5dd", fontFamily: "inherit" }} />
                  </label>
                  <button onClick={() => void saveFollowup()} disabled={saving || !selectedDemand} style={{ padding: "14px 18px", borderRadius: 16, border: "1px solid #111827", background: saving ? "#98a2b3" : "#111827", color: "white", fontWeight: 900 }}>
                    {saving ? "Registrando..." : "Registrar seguimiento"}
                  </button>
                </div>
              )}
            </article>

            {selectedDemand ? (
              <article style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #eaecf0" }}>
                <h2 style={{ marginTop: 0 }}>Evidencia registrada</h2>
                <p><strong>Owner:</strong> {asText(selectedDemand.committee_inputs?.portfolio_followup_owner, "Sin asignar")}</p>
                <p><strong>Acción:</strong> {asText(selectedDemand.committee_inputs?.portfolio_followup_action, "Sin acción registrada")}</p>
                <p><strong>Fecha compromiso:</strong> {formatDateOnly(asText(selectedDemand.committee_inputs?.portfolio_followup_due_date, ""))}</p>
                <p><strong>Comentario:</strong> {asText(selectedDemand.committee_inputs?.portfolio_followup_comment, "Sin comentario registrado")}</p>
                <p><strong>Registrado:</strong> {formatDate(asText(selectedDemand.committee_inputs?.portfolio_followup_recorded_at, ""))}</p>
              </article>
            ) : null}
          </aside>
        </section>
      </section>
    </main>
  );
}
