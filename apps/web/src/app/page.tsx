"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type CommitteeRoute = {
  route?: string;
  committee_stage?: string;
  required_reviewers?: string[];
  required_review_roles?: string[];
  suggested_decision?: string;
  data_architect_final_validation_required?: boolean;
};

type ValidationResult = {
  classification: { initiative_type: string; confidence: number; rationale: string };
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
  business_inputs?: Record<string, unknown>;
  committee_inputs?: Record<string, unknown>;
  validation_state?: Record<string, unknown>;
  scoring?: {
    score: number;
    priority: string;
    rationale?: string;
    financial_signal?: string;
  };
  financials?: {
    van_usd?: number | null;
    roi?: number | null;
    tir?: number | null;
    payback_years?: number | null;
    payback_months?: number | null;
  };
};

type PersistedValidationResponse = { demand: DemandRecord; validation: ValidationResult };
type BacklogResponse = { count: number; demands: DemandRecord[] };
type RuntimeMode = "demo" | "api" | "error" | "loading";
type ActiveView = "intake" | "committee" | "executive";
type PillTone = "neutral" | "ok" | "warn" | "risk" | "dark";
type PriorityLabel = "Alta" | "Media" | "Backlog" | "Reformular" | "Pendiente";
type ScoreScaleKey = "impact" | "alignment" | "data" | "technical" | "effort" | "risk" | "reuse";

const benchmarkScore = 4.0;
const numberOptions = [1, 2, 3, 4, 5];

const scoreOptionLabels: Record<ScoreScaleKey, Record<number, string>> = {
  impact: {
    1: "Muy bajo",
    2: "Bajo",
    3: "Medio",
    4: "Alto",
    5: "Muy alto"
  },
  alignment: {
    1: "Sin alineamiento",
    2: "Alineamiento bajo",
    3: "Alineamiento parcial",
    4: "Alineamiento alto",
    5: "Prioridad estratégica"
  },
  data: {
    1: "Datos no disponibles",
    2: "Parciales / baja calidad",
    3: "Disponibles · requieren validación",
    4: "Trazables / buena calidad",
    5: "Gobernados y listos"
  },
  technical: {
    1: "No viable",
    2: "Viabilidad baja",
    3: "Viabilidad media",
    4: "Viabilidad alta",
    5: "Altamente viable"
  },
  effort: {
    1: "Muy alto · > 6 meses",
    2: "Alto · 3 a 6 meses",
    3: "Medio · 6 a 12 semanas",
    4: "Bajo · 4 a 6 semanas",
    5: "Quick win · < 4 semanas"
  },
  risk: {
    1: "Alto · no mitigado",
    2: "Relevante · controles débiles",
    3: "Medio · mitigable",
    4: "Bajo · controles definidos",
    5: "Muy bajo · controles listos"
  },
  reuse: {
    1: "Muy baja",
    2: "Baja",
    3: "Media",
    4: "Alta",
    5: "Muy alta"
  }
};

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
    architecture_gaps: ["La arquitectura debe ser validada por el Arquitecto de Datos antes de pasar a scoring."],
    human_architecture_review_required: true
  },
  policy_gaps: ["Asignar Data Owner y Data Steward antes de Comité Operativo."],
  finops_gaps: ["Definir owner de costo, presupuesto, alertas y estrategia de consumo."],
  operative_committee: {
    route: "operative_committee_architect_review",
    required_reviewers: ["Data Architect", "Data Owner", "Data Steward"],
    suggested_decision: "architect_review",
    data_architect_final_validation_required: true
  },
  committee_summary:
    "La solicitud fue estructurada por el intake multiagente. Presenta brechas que deben ser revisadas en Comité Operativo."
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

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function SelectScore({
  label,
  value,
  onChange,
  scale
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  scale: ScoreScaleKey;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {numberOptions.map((item) => (
          <option key={item} value={item}>
            {item} · {scoreOptionLabels[scale][item]}
          </option>
        ))}
      </select>
      <small>{scoreOptionLabels[scale][value]}</small>
    </label>
  );
}

function NumericField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <label>
      {label}
      <div className="input-with-suffix">
        <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <span>{suffix}</span> : null}
      </div>
    </label>
  );
}

function labelize(value: string | undefined | null) {
  return value ? value.replaceAll("_", " ") : "No definido";
}

function compact(value: string | undefined | null, size = 72) {
  const text = labelize(value);
  return text.length > size ? `${text.slice(0, size)}…` : text;
}

function asNumber(value: unknown, fallback = 3) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Pendiente";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Pendiente";
  return `${value.toFixed(1)}%`;
}

function statusTone(status: string): PillTone {
  if (status.includes("scored") || status.includes("approved")) return "ok";
  if (status.includes("rejected") || status.includes("archived")) return "risk";
  if (status.includes("reformulation") || status.includes("review")) return "warn";
  return "neutral";
}

function gapCount(demand: DemandRecord) {
  return demand.policy_gaps.length + demand.architecture_gaps.length + demand.finops_gaps.length;
}

function readinessFromDemand(demand: DemandRecord) {
  return Math.max(25, 100 - gapCount(demand) * 12);
}

function scoreFromDemand(demand: DemandRecord): number | null {
  return typeof demand.scoring?.score === "number" ? demand.scoring.score : null;
}

function priorityFromDemand(demand: DemandRecord): PriorityLabel {
  const explicit = demand.scoring?.priority;
  if (explicit === "Alta" || explicit === "Media" || explicit === "Backlog" || explicit === "Reformular") {
    return explicit;
  }

  // Compatibilidad visual con registros creados por el modelo anterior.
  if (explicit === "Baja") return "Backlog";

  return "Pendiente";
}

function priorityTone(priority: PriorityLabel): PillTone {
  if (priority === "Alta") return "risk";
  if (priority === "Media") return "warn";
  if (priority === "Reformular") return "risk";
  return "neutral";
}

function committeeRecommendationFromDemand(demand: DemandRecord) {
  const explicit = asText(demand.committee_inputs?.committee_recommendation, "");
  if (explicit) return explicit;

  const priority = priorityFromDemand(demand);
  if (priority === "Alta") return "execute";
  if (priority === "Media") return "conditioned";
  if (priority === "Backlog") return "backlog";
  return "reformulate";
}

function committeeReviewers(demand: DemandRecord): string[] {
  return demand.committee.required_reviewers ?? demand.committee.required_review_roles ?? [];
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<ActiveView>("intake");
  const [title, setTitle] = useState("Validación de calidad de clientes para dashboard ejecutivo");
  const [description, setDescription] = useState(
    "Necesitamos integrar datos de clientes desde fuentes operacionales, llevarlos a Bronze, Silver y Gold, crear controles de calidad y publicar un dashboard ejecutivo."
  );
  const [targetConsumption, setTargetConsumption] = useState("BI ejecutivo / dashboard");
  const [requesterArea, setRequesterArea] = useState("Comercial");
  const [domainHint, setDomainHint] = useState("Clientes");

  const [operationalImpact, setOperationalImpact] = useState(4);
  const [operationalJustification, setOperationalJustification] = useState("Mejora procesos críticos y decisiones ejecutivas.");
  const [strategicImpact, setStrategicImpact] = useState(4);
  const [strategicImpactJustification, setStrategicImpactJustification] = useState("Alineado a crecimiento, rentabilidad y experiencia de cliente.");
  const [strategicAlignment, setStrategicAlignment] = useState(5);
  const [strategicAlignmentJustification, setStrategicAlignmentJustification] = useState("Habilita una prioridad estratégica de negocio o gobierno.");
  const [roiPercent, setRoiPercent] = useState(60);
  const [vanUsd, setVanUsd] = useState(50000);
  const [tirPercent, setTirPercent] = useState(25);
  const [paybackYears, setPaybackYears] = useState(1.8);

  const [result, setResult] = useState<ValidationResult>(defaultResult);
  const [persistedDemand, setPersistedDemand] = useState<DemandRecord | null>(null);
  const [backlog, setBacklog] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  const [mode, setMode] = useState<RuntimeMode>("demo");
  const [connectionMessage, setConnectionMessage] = useState("Esperando validación del requerimiento.");
  const [backlogMessage, setBacklogMessage] = useState("Backlog pendiente de sincronización.");
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filterArea, setFilterArea] = useState("Todas");
  const [filterDomain, setFilterDomain] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPriority, setFilterPriority] = useState("Todas");
  const [searchText, setSearchText] = useState("");

  const [editArea, setEditArea] = useState("Comercial");
  const [editDomain, setEditDomain] = useState("Clientes");
  const [editOperationalImpact, setEditOperationalImpact] = useState(4);
  const [editOperationalJustification, setEditOperationalJustification] = useState("");
  const [editStrategicImpact, setEditStrategicImpact] = useState(4);
  const [editStrategicImpactJustification, setEditStrategicImpactJustification] = useState("");
  const [editStrategicAlignment, setEditStrategicAlignment] = useState(5);
  const [editStrategicAlignmentJustification, setEditStrategicAlignmentJustification] = useState("");
  const [editRoiPercent, setEditRoiPercent] = useState(50);
  const [editVanUsd, setEditVanUsd] = useState(30000);
  const [editTirPercent, setEditTirPercent] = useState(20);
  const [editPaybackYears, setEditPaybackYears] = useState(2);
  const [editDataReadiness, setEditDataReadiness] = useState(3);
  const [editDataReadinessJustification, setEditDataReadinessJustification] = useState("");
  const [editTechnicalFeasibility, setEditTechnicalFeasibility] = useState(3);
  const [editTechnicalFeasibilityJustification, setEditTechnicalFeasibilityJustification] = useState("");
  const [editExecutionEffort, setEditExecutionEffort] = useState(3);
  const [editExecutionEffortJustification, setEditExecutionEffortJustification] = useState("");
  const [editRiskControl, setEditRiskControl] = useState(3);
  const [editRiskControlJustification, setEditRiskControlJustification] = useState("");
  const [editReusePotential, setEditReusePotential] = useState(3);
  const [editReusePotentialJustification, setEditReusePotentialJustification] = useState("");
  const [committeeRecommendation, setCommitteeRecommendation] = useState("execute");
  const [committeeReason, setCommitteeReason] = useState(
    "La evaluación operativa y el score respaldan elevar la demanda a revisión ejecutiva."
  );
  const [committeeConditions, setCommitteeConditions] = useState(
    "Sujeto a los controles, dependencias y guardrails registrados para la demanda."
  );
  const [editMessage, setEditMessage] = useState("Selecciona una demanda para editar.");

  const selectedDemand = useMemo(
    () => backlog.find((item) => item.demand_id === selectedDemandId) ?? persistedDemand,
    [backlog, persistedDemand, selectedDemandId]
  );

  const areas = useMemo(() => ["Todas", ...Array.from(new Set(backlog.map((item) => item.request.requester_area || "No definida")))], [backlog]);
  const domains = useMemo(() => ["Todos", ...Array.from(new Set(backlog.map((item) => item.request.domain_hint || "No definido")))], [backlog]);
  const statuses = useMemo(() => ["Todos", ...Array.from(new Set(backlog.map((item) => item.status)))], [backlog]);

  const filteredBacklog = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return backlog.filter((item) => {
      const priority = priorityFromDemand(item);
      const matchesText = !q || `${item.demand_id} ${item.request.title} ${item.request.description}`.toLowerCase().includes(q);
      const matchesArea = filterArea === "Todas" || item.request.requester_area === filterArea;
      const matchesDomain = filterDomain === "Todos" || item.request.domain_hint === filterDomain;
      const matchesStatus = filterStatus === "Todos" || item.status === filterStatus;
      const matchesPriority = filterPriority === "Todas" || priority === filterPriority;
      return matchesText && matchesArea && matchesDomain && matchesStatus && matchesPriority;
    });
  }, [backlog, filterArea, filterDomain, filterStatus, filterPriority, searchText]);

  const metrics = useMemo(() => {
    const total = backlog.length;
    const scores = backlog
      .map(scoreFromDemand)
      .filter((score): score is number => score !== null);

    const averageScore = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    const high = backlog.filter((item) => priorityFromDemand(item) === "Alta").length;
    const medium = backlog.filter((item) => priorityFromDemand(item) === "Media").length;
    const backlogPriority = backlog.filter((item) => priorityFromDemand(item) === "Backlog").length;
    const reformulate = backlog.filter((item) => priorityFromDemand(item) === "Reformular").length;
    const pending = backlog.filter((item) => priorityFromDemand(item) === "Pendiente").length;
    const review = backlog.filter((item) => item.status.includes("review")).length;
    const scored = scores.length;
    const events = backlog.reduce((sum, item) => sum + item.events.length, 0);
    const policyGaps = backlog.reduce((sum, item) => sum + item.policy_gaps.length, 0);
    const architectureGaps = backlog.reduce((sum, item) => sum + item.architecture_gaps.length, 0);
    const finopsGaps = backlog.reduce((sum, item) => sum + item.finops_gaps.length, 0);
    const van = backlog.reduce(
      (sum, item) => sum + (typeof item.financials?.van_usd === "number" ? item.financials.van_usd : 0),
      0
    );

    return {
      total,
      averageScore,
      high,
      medium,
      backlogPriority,
      reformulate,
      pending,
      review,
      scored,
      events,
      policyGaps,
      architectureGaps,
      finopsGaps,
      van
    };
  }, [backlog]);

  const topCases = useMemo(
    () =>
      [...backlog]
        .filter((item) => scoreFromDemand(item) !== null)
        .sort((left, right) => (scoreFromDemand(right) ?? 0) - (scoreFromDemand(left) ?? 0))
        .slice(0, 5),
    [backlog]
  );

  const ownerChecklistComplete = title.length > 2 && description.length > 10 && operationalJustification.length > 10 && strategicImpactJustification.length > 10 && strategicAlignmentJustification.length > 10;
  const drawerOwnerComplete = editOperationalJustification.length > 10 && editStrategicImpactJustification.length > 10 && editStrategicAlignmentJustification.length > 10;
  const drawerCommitteeComplete = editDataReadinessJustification.length > 10 && editTechnicalFeasibilityJustification.length > 10 && editExecutionEffortJustification.length > 10 && editRiskControlJustification.length > 10 && editReusePotentialJustification.length > 10;

  const scorePreview = useMemo(() => {
    const businessValue = Math.round((editOperationalImpact + editStrategicImpact) / 2);

    const components = [
      { key: "business_value", label: "Valor de negocio", value: businessValue, weight: 0.30 },
      { key: "strategic_alignment", label: "Alineamiento estratégico", value: editStrategicAlignment, weight: 0.20 },
      { key: "data_readiness", label: "Disponibilidad / calidad de datos", value: editDataReadiness, weight: 0.15 },
      { key: "technical_feasibility", label: "Viabilidad técnica", value: editTechnicalFeasibility, weight: 0.15 },
      { key: "execution_effort", label: "Esfuerzo / time to market", value: editExecutionEffort, weight: 0.10 },
      { key: "risk_control", label: "Riesgo / cumplimiento", value: editRiskControl, weight: 0.10 }
    ];

    const score = Math.round(
      components.reduce((sum, component) => sum + component.value * component.weight, 0) * 100
    ) / 100;

    let priority: PriorityLabel;
    if (score >= 4.0) priority = "Alta";
    else if (score >= 3.2) priority = "Media";
    else if (score >= 2.5) priority = "Backlog";
    else priority = "Reformular";

    return { businessValue, components, score, priority };
  }, [
    editOperationalImpact,
    editStrategicImpact,
    editStrategicAlignment,
    editDataReadiness,
    editTechnicalFeasibility,
    editExecutionEffort,
    editRiskControl
  ]);

  async function loadBacklog(highlightDemandId?: string) {
    try {
      setBacklogLoading(true);
      const response = await fetch("/api/demands/backlog", { cache: "no-store" });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Backlog failed with HTTP ${response.status}: ${responseText}`);
      const payload = JSON.parse(responseText) as BacklogResponse;
      setBacklog(payload.demands);
      setBacklogMessage(`Backlog sincronizado: ${payload.count} solicitudes registradas.`);
      if (highlightDemandId) setSelectedDemandId(highlightDemandId);
      else if (!selectedDemandId && payload.demands.length) setSelectedDemandId(payload.demands[0].demand_id);
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

  function businessInputsPayload() {
    return {
      operational_impact: operationalImpact,
      operational_justification: operationalJustification,
      strategic_impact: strategicImpact,
      strategic_impact_justification: strategicImpactJustification,
      strategic_alignment: strategicAlignment,
      strategic_alignment_justification: strategicAlignmentJustification,
      roi_percent: roiPercent,
      van_usd: vanUsd,
      tir_percent: tirPercent,
      payback_years: paybackYears
    };
  }

  async function persistDemandUpdate(demandId: string, payload: Record<string, unknown>) {
    const response = await fetch("/api/demands/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demand_id: demandId, ...payload })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Demand update failed with HTTP ${response.status}: ${text}`);
    return JSON.parse(text) as { demand: DemandRecord };
  }

  async function validateRequest() {
    try {
      setMode("loading");
      setConnectionMessage("Validando solicitud y registrando inputs del Data Owner...");
      const response = await fetch("/api/intake/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          requester_area: requesterArea,
          requester_role: "Data Owner",
          domain_hint: domainHint,
          target_consumption: targetConsumption
        })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Proxy/API validation failed with HTTP ${response.status}: ${responseText}`);
      const payload = JSON.parse(responseText) as PersistedValidationResponse;
      const updated = await persistDemandUpdate(payload.demand.demand_id, {
        request: { requester_area: requesterArea, domain_hint: domainHint },
        business_inputs: businessInputsPayload(),
        validation_state: { data_owner_inputs_complete: ownerChecklistComplete, committee_inputs_complete: false },
        actor: "Data Owner",
        comment: "Inputs de valor de negocio y supuestos económicos registrados desde intake."
      });
      setMode("api");
      setResult(payload.validation);
      setPersistedDemand(updated.demand);
      setSelectedDemandId(updated.demand.demand_id);
      setConnectionMessage(`Solicitud ${updated.demand.demand_id} enviada al Comité Operativo con checklist del Data Owner.`);
      await loadBacklog(updated.demand.demand_id);
      setActiveView("committee");
      openEditor(updated.demand);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al conectar con el API.";
      setMode("error");
      setConnectionMessage(`No se pudo conectar con el API: ${message}`);
    }
  }

  function openEditor(demand: DemandRecord) {
    const business = demand.business_inputs ?? {};
    const committee = demand.committee_inputs ?? {};
    setSelectedDemandId(demand.demand_id);
    setEditArea(demand.request.requester_area || "Comercial");
    setEditDomain(demand.request.domain_hint || "Clientes");
    setEditOperationalImpact(asNumber(business.operational_impact, 4));
    setEditOperationalJustification(asText(business.operational_justification, "Mejora procesos críticos y decisiones ejecutivas."));
    setEditStrategicImpact(asNumber(business.strategic_impact, 4));
    setEditStrategicImpactJustification(asText(business.strategic_impact_justification, "Alineado a prioridades estratégicas de negocio."));
    setEditStrategicAlignment(asNumber(business.strategic_alignment, 5));
    setEditStrategicAlignmentJustification(asText(business.strategic_alignment_justification, "Habilita prioridad estratégica de negocio o gobierno."));
    setEditRoiPercent(asNumber(business.roi_percent, 50));
    setEditVanUsd(asNumber(business.van_usd, 30000));
    setEditTirPercent(asNumber(business.tir_percent, 20));
    setEditPaybackYears(asNumber(business.payback_years, 2));
    setEditDataReadiness(asNumber(committee.data_readiness, 3));
    setEditDataReadinessJustification(asText(committee.data_readiness_justification, "Datos disponibles con calidad media; requiere validación."));
    setEditTechnicalFeasibility(asNumber(committee.technical_feasibility, 3));
    setEditTechnicalFeasibilityJustification(asText(committee.technical_feasibility_justification, "Factible con dependencias y diseño adicional."));
    setEditExecutionEffort(asNumber(committee.execution_effort, 3));
    setEditExecutionEffortJustification(asText(committee.execution_effort_justification, "Ejecución factible en 6 a 12 semanas."));
    setEditRiskControl(asNumber(committee.risk_control, 3));
    setEditRiskControlJustification(asText(committee.risk_control_justification, "Riesgo medio mitigable con controles estándar."));
    setEditReusePotential(asNumber(committee.reuse_potential, 4));
    setEditReusePotentialJustification(asText(committee.reuse_potential_justification, "Alta reutilización aplicable a múltiples áreas o dominios."));
    setCommitteeRecommendation(committeeRecommendationFromDemand(demand));
    setCommitteeReason(
      asText(
        committee.committee_reason,
        "La evaluación operativa y el score respaldan elevar la demanda a revisión ejecutiva."
      )
    );
    setCommitteeConditions(
      asText(
        committee.committee_conditions,
        "Sujeto a los controles, dependencias y guardrails registrados para la demanda."
      )
    );
    setEditMessage(`Editando ${demand.demand_id}`);
    setDrawerOpen(true);
  }

  function editorPayload() {
    return {
      request: { requester_area: editArea, domain_hint: editDomain },
      business_inputs: {
        operational_impact: editOperationalImpact,
        operational_justification: editOperationalJustification,
        strategic_impact: editStrategicImpact,
        strategic_impact_justification: editStrategicImpactJustification,
        strategic_alignment: editStrategicAlignment,
        strategic_alignment_justification: editStrategicAlignmentJustification,
        roi_percent: editRoiPercent,
        van_usd: editVanUsd,
        tir_percent: editTirPercent,
        payback_years: editPaybackYears
      },
      committee_inputs: {
        data_readiness: editDataReadiness,
        data_readiness_justification: editDataReadinessJustification,
        technical_feasibility: editTechnicalFeasibility,
        technical_feasibility_justification: editTechnicalFeasibilityJustification,
        execution_effort: editExecutionEffort,
        execution_effort_justification: editExecutionEffortJustification,
        risk_control: editRiskControl,
        risk_control_justification: editRiskControlJustification,
        reuse_potential: editReusePotential,
        reuse_potential_justification: editReusePotentialJustification
      },
      validation_state: {
        data_owner_inputs_validated: drawerOwnerComplete,
        committee_inputs_complete: drawerCommitteeComplete,
        ready_for_scoring: drawerOwnerComplete && drawerCommitteeComplete
      },
      actor: "Comité Operativo",
      comment: "Edición parcial y validación de criterios realizada desde grilla de comité."
    };
  }

  async function saveEditor() {
    if (!selectedDemand) return;
    try {
      setActionLoading(true);
      setEditMessage("Guardando cambios gobernados...");
      const payload = await persistDemandUpdate(selectedDemand.demand_id, editorPayload());
      setPersistedDemand(payload.demand);
      setBacklog((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setEditMessage(`Cambios guardados para ${payload.demand.demand_id}.`);
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al guardar.";
      setEditMessage(`No se pudo guardar: ${message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function calculateScore() {
    if (!selectedDemand) return;
    if (!drawerOwnerComplete || !drawerCommitteeComplete) {
      setEditMessage("Completa y valida los checklists del Data Owner y Comité antes de calcular score.");
      return;
    }
    try {
      setActionLoading(true);
      setEditMessage("Guardando validación y calculando score...");
      await saveEditor();
      const businessValue = scorePreview.businessValue;
      const response = await fetch("/api/demands/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demand_id: selectedDemand.demand_id,
          strategic_alignment: editStrategicAlignment,
          business_value: businessValue,
          data_readiness: editDataReadiness,
          technical_feasibility: editTechnicalFeasibility,
          roi_percent: editRoiPercent,
          van_usd: editVanUsd,
          tir_percent: editTirPercent,
          payback_years: editPaybackYears,
          operational_impact: editOperationalImpact,
          operational_justification: editOperationalJustification,
          strategic_impact: editStrategicImpact,
          strategic_impact_justification: editStrategicImpactJustification,
          strategic_alignment_justification: editStrategicAlignmentJustification,
          data_readiness_justification: editDataReadinessJustification,
          technical_feasibility_justification: editTechnicalFeasibilityJustification,
          execution_effort: editExecutionEffort,
          execution_effort_justification: editExecutionEffortJustification,
          risk_control: editRiskControl,
          risk_control_justification: editRiskControlJustification,
          reuse_potential: editReusePotential,
          reuse_potential_justification: editReusePotentialJustification,
          actor: "Comité Operativo",
          comment: "Score calculado luego de validar inputs del Data Owner y completar checklist técnico/gobierno."
        })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Score failed with HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as { demand: DemandRecord };
      setPersistedDemand(payload.demand);
      setBacklog((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setEditMessage(`Score calculado: ${payload.demand.scoring?.score ?? "N/D"} · Prioridad ${payload.demand.scoring?.priority ?? "N/D"}.`);
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al calcular score.";
      setEditMessage(`No se pudo calcular score: ${message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function sendToExecutiveCommittee() {
    if (!selectedDemand) return;

    const persistedScore = scoreFromDemand(selectedDemand);

    if (persistedScore === null) {
      setEditMessage("Primero debes recalcular y persistir el score antes de enviar al Comité Ejecutivo.");
      return;
    }

    if (!drawerOwnerComplete || !drawerCommitteeComplete) {
      setEditMessage("Completa los checklists del Data Owner y Comité antes de elevar la demanda.");
      return;
    }

    if (Math.abs(persistedScore - scorePreview.score) > 0.001) {
      setEditMessage(
        `El score preliminar (${scorePreview.score.toFixed(2)}) difiere del persistido (${persistedScore.toFixed(2)}). Recalcula el score antes de enviar.`
      );
      return;
    }

    if (committeeReason.trim().length < 10) {
      setEditMessage("Registra una justificación de Comité antes de enviar la demanda.");
      return;
    }

    const confirmed = window.confirm(
      "¿Enviar esta demanda al Comité Ejecutivo / Sponsor? Se cerrará la evaluación operativa y quedará disponible para revisión ejecutiva."
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setEditMessage("Registrando decisión formal del Comité Operativo...");

      const now = new Date().toISOString();
      const basePayload = editorPayload();

      const payload = await persistDemandUpdate(selectedDemand.demand_id, {
        ...basePayload,
        committee_inputs: {
          ...basePayload.committee_inputs,
          committee_recommendation: committeeRecommendation,
          committee_final_decision: "ready_for_executive_committee",
          committee_final_status: selectedDemand.status,
          committee_reason: committeeReason.trim(),
          committee_conditions: committeeConditions.trim(),
          committee_next_step: "sponsor_review",
          committee_decision_recorded_by: "Comité Operativo",
          committee_decision_recorded_roles: ["committee_member"],
          committee_decision_recorded_at: now
        },
        validation_state: {
          ...(selectedDemand.validation_state ?? {}),
          ...basePayload.validation_state,
          data_owner_inputs_validated: drawerOwnerComplete,
          committee_inputs_complete: drawerCommitteeComplete,
          ready_for_scoring: true,
          committee_decision_recorded: true
        },
        decision: "ready_for_executive_committee",
        actor: "Comité Operativo",
        comment:
          "Decisión formal del Comité Operativo registrada; demanda lista para Comité Ejecutivo / Sponsor."
      });

      setPersistedDemand(payload.demand);
      setBacklog((items) =>
        items.map((item) =>
          item.demand_id === payload.demand.demand_id ? payload.demand : item
        )
      );
      setEditMessage(
        `${payload.demand.demand_id} lista para Comité Ejecutivo / Sponsor.`
      );
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido al registrar la decisión.";
      setEditMessage(`No se pudo enviar al Comité Ejecutivo: ${message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function updateDemandStatus(status: string, decision: string, comment: string) {
    if (!selectedDemand) return;
    try {
      setActionLoading(true);
      const response = await fetch("/api/demands/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demand_id: selectedDemand.demand_id, status, decision, actor: "Comité Operativo", comment })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Status update failed with HTTP ${response.status}: ${responseText}`);
      const payload = JSON.parse(responseText) as { demand: DemandRecord };
      setPersistedDemand(payload.demand);
      setBacklog((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setEditMessage(`Estado actualizado: ${payload.demand.demand_id} → ${labelize(payload.demand.status)}.`);
      await loadBacklog(payload.demand.demand_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al actualizar estado.";
      setEditMessage(`No se pudo actualizar el estado: ${message}`);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="app-hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 11</p>
          <h1>{activeView === "intake" ? "Intake conversacional del Data Owner" : activeView === "committee" ? "Grilla CRUD y validación del Comité" : "Tablero ejecutivo de priorización"}</h1>
          <p className="hero-copy">
            {activeView === "intake"
              ? "El Data Owner registra la solicitud, valor de negocio y supuestos económicos como checklist guiado."
              : activeView === "committee"
                ? "El Comité filtra, edita, valida inputs, completa criterios técnicos y recalcula score desde un panel lateral."
                : "Comité Operativo y Estratégico revisan score, prioridad, VAN, brechas y trazabilidad del portafolio."}
          </p>
        </div>
        <aside className="hero-panel">
          <span>Estado</span>
          <strong>{mode === "api" ? "API conectada" : mode === "loading" ? "Procesando" : mode === "error" ? "Revisar API" : "Demo local"}</strong>
          <small>{backlogLoading ? "Sincronizando backlog..." : backlogMessage}</small>
        </aside>
      </section>

      <nav className="view-tabs" aria-label="Vistas de ATLAS DataGob">
        <button className={activeView === "intake" ? "active" : ""} onClick={() => setActiveView("intake")}>1 · Intake negocio</button>
        <button className={activeView === "committee" ? "active" : ""} onClick={() => setActiveView("committee")}>2 · Comité operativo</button>
        <button className={activeView === "executive" ? "active" : ""} onClick={() => setActiveView("executive")}>3 · Tablero ejecutivo</button>
      </nav>

      <section className={`status-card status-${mode}`}>
        <strong>Estado de ejecución</strong>
        <span>{connectionMessage}</span>
      </section>

      {activeView === "intake" && (
        <section className="view-panel intake-layout">
          <article className="card form-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow small">Data Owner · solicitud</p>
                <h2>Conversación inicial</h2>
              </div>
              <Pill tone={ownerChecklistComplete ? "ok" : "warn"}>{ownerChecklistComplete ? "Completo" : "Incompleto"}</Pill>
            </div>
            <div className="form-grid two">
              <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>Área<input value={requesterArea} onChange={(event) => setRequesterArea(event.target.value)} /></label>
              <label>Dominio<input value={domainHint} onChange={(event) => setDomainHint(event.target.value)} /></label>
              <label>Consumo esperado<select value={targetConsumption} onChange={(event) => setTargetConsumption(event.target.value)}><option>BI ejecutivo / dashboard</option><option>Machine Learning</option><option>GenAI / RAG / agente</option><option>Streaming / tiempo real</option></select></label>
            </div>
            <label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} /></label>
          </article>

          <article className="card form-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow small">Data Owner · valor</p>
                <h2>Checklist de negocio y supuestos</h2>
              </div>
              <Pill tone="dark">No lo llena el Comité</Pill>
            </div>
            <div className="form-grid two">
              <SelectScore scale="impact" label="Impacto operativo" value={operationalImpact} onChange={setOperationalImpact} />
              <SelectScore scale="impact" label="Impacto estratégico" value={strategicImpact} onChange={setStrategicImpact} />
              <SelectScore scale="alignment" label="Alineamiento estratégico" value={strategicAlignment} onChange={setStrategicAlignment} />
              <NumericField label="ROI estimado" value={roiPercent} onChange={setRoiPercent} suffix="%" />
              <NumericField label="VAN estimado" value={vanUsd} onChange={setVanUsd} suffix="USD" />
              <NumericField label="TIR estimada" value={tirPercent} onChange={setTirPercent} suffix="%" />
              <NumericField label="Payback" value={paybackYears} onChange={setPaybackYears} suffix="años" />
            </div>
            <label>Justificación impacto operativo<textarea value={operationalJustification} onChange={(event) => setOperationalJustification(event.target.value)} rows={3} /></label>
            <label>Justificación impacto estratégico<textarea value={strategicImpactJustification} onChange={(event) => setStrategicImpactJustification(event.target.value)} rows={3} /></label>
            <label>Justificación alineamiento estratégico<textarea value={strategicAlignmentJustification} onChange={(event) => setStrategicAlignmentJustification(event.target.value)} rows={3} /></label>
            <button className="primary-action" onClick={validateRequest} disabled={mode === "loading"}>{mode === "loading" ? "Procesando..." : "Enviar a Comité Operativo"}</button>
          </article>
        </section>
      )}

      {activeView === "committee" && (
        <section className="view-panel committee-layout">
          <article className="card full-span">
            <div className="section-title-row">
              <div>
                <p className="eyebrow small">CRUD gobernado</p>
                <h2>Grilla de demanda</h2>
              </div>
              <Pill tone="neutral">{filteredBacklog.length} de {backlog.length}</Pill>
            </div>
            <div className="filters-row">
              <input placeholder="Buscar por ID, título o descripción" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
              <select value={filterArea} onChange={(event) => setFilterArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={filterDomain} onChange={(event) => setFilterDomain(event.target.value)}>{domains.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>{statuses.map((item) => <option key={item}>{labelize(item)}</option>)}</select>
              <select value={filterPriority} onChange={(event) => setFilterPriority(event.target.value)}><option>Todas</option><option>Alta</option><option>Media</option><option>Backlog</option><option>Reformular</option><option>Pendiente</option></select>
            </div>
            {filteredBacklog.length === 0 ? (
              <EmptyState title="Sin demandas para esos filtros" copy="Registra una solicitud desde el intake o ajusta los filtros de la grilla." />
            ) : (
              <div className="data-grid-wrap">
                <table className="data-grid">
                  <thead><tr><th>ID</th><th>Solicitud</th><th>Área</th><th>Dominio</th><th>Estado</th><th>Prioridad</th><th>Score</th><th>VAN</th><th>Acción</th></tr></thead>
                  <tbody>
                    {filteredBacklog.map((item) => {
                      const priority = priorityFromDemand(item);
                      const score = scoreFromDemand(item);
                      return (
                        <tr key={item.demand_id} className={selectedDemandId === item.demand_id ? "selected" : ""}>
                          <td><button className="link-button" onClick={() => openEditor(item)}>{item.demand_id}</button></td>
                          <td><strong>{item.request.title}</strong><small>{compact(item.request.description, 92)}</small></td>
                          <td>{item.request.requester_area}</td>
                          <td>{item.request.domain_hint || "No definido"}</td>
                          <td><Pill tone={statusTone(item.status)}>{labelize(item.status)}</Pill></td>
                          <td><Pill tone={priorityTone(priority)}>{priority}</Pill></td>
                          <td>{score === null ? "Pendiente" : score.toFixed(2)}</td>
                          <td>{formatCurrency(item.financials?.van_usd)}</td>
                          <td><button className="secondary-action small" onClick={() => openEditor(item)}>Editar / validar</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <aside className={`drawer ${drawerOpen ? "open" : ""}`}>
            <div className="drawer-header">
              <div>
                <p className="eyebrow small">Panel lateral</p>
                <h2>{selectedDemand ? selectedDemand.demand_id : "Sin selección"}</h2>
              </div>
              <button className="icon-button" onClick={() => setDrawerOpen(false)}>×</button>
            </div>
            {!selectedDemand ? (
              <EmptyState title="Selecciona una demanda" copy="Desde la grilla puedes abrir una demanda, editar campos y calcular score." />
            ) : (
              <div className="drawer-body">
                <div className="drawer-status">
                  <Pill tone={drawerOwnerComplete ? "ok" : "warn"}>Data Owner {drawerOwnerComplete ? "validado" : "pendiente"}</Pill>
                  <Pill tone={drawerCommitteeComplete ? "ok" : "warn"}>Inputs Comité {drawerCommitteeComplete ? "completos" : "pendientes"}</Pill>
                </div>
                <p className="drawer-message">{editMessage}</p>

                <section className="drawer-section">
                  <h3>1. Identificación</h3>
                  <div className="form-grid two"><label>Área<input value={editArea} onChange={(event) => setEditArea(event.target.value)} /></label><label>Dominio<input value={editDomain} onChange={(event) => setEditDomain(event.target.value)} /></label></div>
                </section>

                <section className="drawer-section">
                  <h3>2. Validar Data Owner</h3>
                  <div className="form-grid two">
                    <SelectScore scale="impact" label="Impacto operativo" value={editOperationalImpact} onChange={setEditOperationalImpact} />
                    <SelectScore scale="impact" label="Impacto estratégico" value={editStrategicImpact} onChange={setEditStrategicImpact} />
                    <SelectScore scale="alignment" label="Alineamiento estratégico" value={editStrategicAlignment} onChange={setEditStrategicAlignment} />
                    <NumericField label="ROI" value={editRoiPercent} onChange={setEditRoiPercent} suffix="%" />
                    <NumericField label="VAN" value={editVanUsd} onChange={setEditVanUsd} suffix="USD" />
                    <NumericField label="TIR" value={editTirPercent} onChange={setEditTirPercent} suffix="%" />
                    <NumericField label="Payback" value={editPaybackYears} onChange={setEditPaybackYears} suffix="años" />
                  </div>
                  <label>Justificación impacto operativo<textarea rows={3} value={editOperationalJustification} onChange={(event) => setEditOperationalJustification(event.target.value)} /></label>
                  <label>Justificación impacto estratégico<textarea rows={3} value={editStrategicImpactJustification} onChange={(event) => setEditStrategicImpactJustification(event.target.value)} /></label>
                  <label>Justificación alineamiento<textarea rows={3} value={editStrategicAlignmentJustification} onChange={(event) => setEditStrategicAlignmentJustification(event.target.value)} /></label>
                </section>

                <section className="drawer-section">
                  <h3>3. Completar Comité Operativo</h3>
                  <div className="form-grid two">
                    <SelectScore scale="data" label="Disponibilidad/calidad de datos" value={editDataReadiness} onChange={setEditDataReadiness} />
                    <SelectScore scale="technical" label="Viabilidad técnica" value={editTechnicalFeasibility} onChange={setEditTechnicalFeasibility} />
                    <SelectScore scale="effort" label="Esfuerzo de ejecución" value={editExecutionEffort} onChange={setEditExecutionEffort} />
                    <SelectScore scale="risk" label="Riesgo/control" value={editRiskControl} onChange={setEditRiskControl} />
                    <SelectScore scale="reuse" label="Reutilización" value={editReusePotential} onChange={setEditReusePotential} />
                  </div>
                  <label>Justificación datos<textarea rows={3} value={editDataReadinessJustification} onChange={(event) => setEditDataReadinessJustification(event.target.value)} /></label>
                  <label>Justificación viabilidad<textarea rows={3} value={editTechnicalFeasibilityJustification} onChange={(event) => setEditTechnicalFeasibilityJustification(event.target.value)} /></label>
                  <label>Justificación esfuerzo<textarea rows={3} value={editExecutionEffortJustification} onChange={(event) => setEditExecutionEffortJustification(event.target.value)} /></label>
                  <label>Justificación riesgo/control<textarea rows={3} value={editRiskControlJustification} onChange={(event) => setEditRiskControlJustification(event.target.value)} /></label>
                  <label>Justificación reutilización<textarea rows={3} value={editReusePotentialJustification} onChange={(event) => setEditReusePotentialJustification(event.target.value)} /></label>
                </section>

                <section className="drawer-section">
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow small">Vista previa · no persistida</p>
                      <h3>Score preliminar</h3>
                    </div>
                    <Pill tone={priorityTone(scorePreview.priority)}>{scorePreview.priority}</Pill>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      alignItems: "center",
                      padding: 16,
                      borderRadius: 16,
                      background: "#f8fafc",
                      border: "1px solid #e4e7ec",
                      marginBottom: 14
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", fontSize: 30 }}>
                        {scorePreview.score.toFixed(2)} / 5
                      </strong>
                      <small>Se actualiza mientras cambias los criterios.</small>
                    </div>
                    <strong>{scorePreview.priority}</strong>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {scorePreview.components.map((component) => (
                      <div
                        key={component.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto",
                          gap: 12,
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid #eaecf0"
                        }}
                      >
                        <span>{component.label}</span>
                        <small>{Math.round(component.weight * 100)}%</small>
                        <strong>{(component.value * component.weight).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  <small style={{ display: "block", marginTop: 12 }}>
                    Valor de negocio = promedio redondeado de impacto operativo e impacto estratégico.
                    Reutilización se registra como evidencia del Comité, pero no pondera el score MVP.
                    El valor se persiste únicamente al pulsar “Recalcular score”.
                  </small>
                </section>

                <section className="drawer-section">
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow small">Gate formal</p>
                      <h3>4. Decisión del Comité Operativo</h3>
                    </div>
                    <Pill tone={scoreFromDemand(selectedDemand) !== null ? "ok" : "warn"}>
                      {scoreFromDemand(selectedDemand) !== null ? "Score persistido" : "Score pendiente"}
                    </Pill>
                  </div>

                  <label>
                    Recomendación al Comité Ejecutivo
                    <select
                      value={committeeRecommendation}
                      onChange={(event) => setCommitteeRecommendation(event.target.value)}
                    >
                      <option value="execute">Ejecutar</option>
                      <option value="conditioned">Ejecutar condicionado</option>
                      <option value="backlog">Backlog</option>
                      <option value="reformulate">Reformular</option>
                    </select>
                    <small>
                      Es la recomendación del Comité Operativo; la decisión ejecutiva permanece en Sponsor Review.
                    </small>
                  </label>

                  <label>
                    Justificación de elevación
                    <textarea
                      rows={3}
                      value={committeeReason}
                      onChange={(event) => setCommitteeReason(event.target.value)}
                    />
                  </label>

                  <label>
                    Condiciones / guardrails
                    <textarea
                      rows={3}
                      value={committeeConditions}
                      onChange={(event) => setCommitteeConditions(event.target.value)}
                    />
                  </label>

                  <small>
                    ATLAS solo habilita el envío cuando existe score persistido y coincide con la
                    vista previa actual. Al confirmar, se registra actor, fecha, recomendación,
                    condiciones y evidencia auditable del gate.
                  </small>
                </section>

                <div className="drawer-actions">
                  <button className="secondary-action" onClick={saveEditor} disabled={actionLoading}>Guardar parcial</button>
                  <button className="primary-action" onClick={calculateScore} disabled={actionLoading}>Recalcular score</button>
                  <button
                    className="primary-action"
                    onClick={sendToExecutiveCommittee}
                    disabled={actionLoading || scoreFromDemand(selectedDemand) === null}
                  >
                    Enviar a Comité Ejecutivo
                  </button>
                  <button className="danger-action" onClick={() => updateDemandStatus("rejected", "rejected_by_committee", "Rechazo/cierre lógico desde Comité Operativo.")} disabled={actionLoading}>Rechazar / cerrar</button>
                </div>

                <section className="drawer-section">
                  <h3>Trazabilidad</h3>
                  <ul className="timeline compact">
                    {selectedDemand.events.slice(-5).reverse().map((event) => (
                      <li key={event.event_id ?? `${event.timestamp}-${event.type}`}><strong>{labelize(event.type)}</strong><span>{formatDate(event.timestamp)} · {event.actor}</span><p>{event.comment}</p></li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </aside>
        </section>
      )}

      {activeView === "executive" && (
        <section className="view-panel executive-layout">
          <div className="kpi-grid">
            <KpiCard label="Score promedio" value={metrics.averageScore ? metrics.averageScore.toFixed(2) : "0.00"} helper={`Benchmark ${benchmarkScore.toFixed(1)}`} tone={metrics.averageScore >= benchmarkScore ? "ok" : "warn"} />
            <KpiCard label="Alta prioridad" value={metrics.high} helper={`${percentage(metrics.high, metrics.total)}% del portafolio`} tone="risk" />
            <KpiCard label="VAN total" value={formatCurrency(metrics.van)} helper="Solo demandas con score" tone="ok" />
            <KpiCard label="Scored" value={metrics.scored} helper="Demandas priorizadas" tone="neutral" />
          </div>
          <article className="card">
            <div className="section-title-row"><div><p className="eyebrow small">Top 5</p><h2>Iniciativas priorizadas</h2></div><Pill tone="dark">Comité estratégico</Pill></div>
            {topCases.length === 0 ? <EmptyState title="Sin portafolio" copy="Registra y puntúa demandas para construir el tablero." /> : (
              <div className="rank-list">
                {topCases.map((item, index) => {
                  const priority = priorityFromDemand(item);
                  return <button key={item.demand_id} className="rank-row" onClick={() => { setActiveView("committee"); openEditor(item); }}><span>#{index + 1}</span><strong>{item.request.title}</strong><Pill tone={priorityTone(priority)}>{priority}</Pill><em>{(scoreFromDemand(item) ?? 0).toFixed(2)}</em><small>{formatCurrency(item.financials?.van_usd)}</small></button>;
                })}
              </div>
            )}
          </article>
          <article className="card">
            <div className="section-title-row"><div><p className="eyebrow small">Distribución</p><h2>Prioridad y brechas</h2></div></div>
            <div className="bars-grid">
              {[
                { label: "Alta", value: metrics.high },
                { label: "Media", value: metrics.medium },
                { label: "Backlog", value: metrics.backlogPriority },
                { label: "Reformular", value: metrics.reformulate },
                { label: "Pendiente", value: metrics.pending }
              ].map((item) => <div key={item.label} className="bar-item"><span>{item.label}</span><div><i style={{ width: `${percentage(item.value, metrics.total)}%` }} /></div><strong>{item.value}</strong></div>)}
              {[{ label: "Política", value: metrics.policyGaps }, { label: "Arquitectura", value: metrics.architectureGaps }, { label: "FinOps", value: metrics.finopsGaps }].map((item) => <div key={item.label} className="bar-item"><span>{item.label}</span><div><i style={{ width: `${Math.min(100, item.value * 12)}%` }} /></div><strong>{item.value}</strong></div>)}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
