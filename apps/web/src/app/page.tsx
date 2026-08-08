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

type BusinessInputs = {
  operationalImpact: number;
  operationalJustification: string;
  strategicImpact: number;
  strategicImpactJustification: string;
  roiPercent: number;
  vanUsd: number;
  tirPercent: number;
  paybackYears: number;
  strategicAlignment: number;
  strategicAlignmentJustification: string;
};

type CommitteeInputs = {
  dataReadiness: number;
  dataReadinessJustification: string;
  technicalFeasibility: number;
  technicalFeasibilityJustification: string;
  executionEffort: number;
  executionEffortJustification: string;
  riskControl: number;
  riskControlJustification: string;
  reusePotential: number;
  reusePotentialJustification: string;
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
  scoring?: {
    score: number;
    priority: string;
    rationale: string;
    components: Record<string, number>;
    financial_signal: string;
    model_version: string;
  };
  financials?: {
    input_mode: string;
    van_usd: number;
    tir_percent?: number | null;
    roi_percent?: number | null;
    payback_years?: number | null;
    financial_score?: number | null;
  };
  business_inputs?: Record<string, unknown>;
  committee_inputs?: Record<string, unknown>;
};

type PersistedValidationResponse = { demand: DemandRecord; validation: ValidationResult };
type BacklogResponse = { count: number; demands: DemandRecord[] };
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
    architecture_gaps: ["La arquitectura debe ser validada por el Arquitecto de Datos antes de pasar a scoring."],
    human_architecture_review_required: true
  },
  policy_gaps: ["Asignar Data Owner y Data Steward antes de Comité Operativo."],
  finops_gaps: ["Estimar volumen, frecuencia de consulta y estrategia de particionado/clustering."],
  operative_committee: {
    route: "operative_committee_architect_review",
    required_reviewers: ["Data Architect", "Data Owner", "Data Steward"],
    suggested_decision: "architect_review",
    data_architect_final_validation_required: true
  },
  committee_summary: "La solicitud requiere revisión de comité con validación final del Arquitecto de Datos."
};

const defaultBusinessInputs: BusinessInputs = {
  operationalImpact: 4,
  operationalJustification: "Mejora procesos críticos. Ej. optimización de rutas, stock, pedidos o cobertura.",
  strategicImpact: 4,
  strategicImpactJustification: "Alineado a prioridades estratégicas. Ej. crecimiento, cobertura, rentabilidad o experiencia cliente.",
  roiPercent: 80,
  vanUsd: 25500,
  tirPercent: 67,
  paybackYears: 1.5,
  strategicAlignment: 5,
  strategicAlignmentJustification: "Alineamiento crítico; habilita prioridad estratégica de negocio o gobierno."
};

const defaultCommitteeInputs: CommitteeInputs = {
  dataReadiness: 4,
  dataReadinessJustification: "Datos disponibles, trazables y con calidad razonable.",
  technicalFeasibility: 4,
  technicalFeasibilityJustification: "Viabilidad alta; arquitectura y fuentes razonablemente definidas.",
  executionEffort: 4,
  executionEffortJustification: "Bajo esfuerzo; ejecución factible en 4 a 6 semanas.",
  riskControl: 4,
  riskControlJustification: "Riesgo bajo; controles definidos y responsables claros.",
  reusePotential: 5,
  reusePotentialJustification: "Muy alta reutilización. Componente base para muchos casos; plataforma, data product o modelo reusable."
};

const viewCopy: Record<ActiveView, { eyebrow: string; title: string; copy: string }> = {
  intake: {
    eyebrow: "Vista 1 · Usuario de negocio / Data Owner",
    title: "Intake guiado de solicitud y valor",
    copy: "El Data Owner registra la demanda y responde un checklist conversacional de impacto, valor económico y alineamiento estratégico."
  },
  committee: {
    eyebrow: "Vista 2 · Comité operativo",
    title: "Grilla CRUD de demanda y validación de score",
    copy: "El comité filtra solicitudes, valida lo capturado por el Data Owner, completa criterios técnicos y calcula el score gobernado."
  },
  executive: {
    eyebrow: "Vista 3 · Comité estratégico",
    title: "Tablero ejecutivo de priorización",
    copy: "Vista agregada de portafolio: score, prioridad, brechas, finanzas y trazabilidad para decisión ejecutiva."
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
  if (status === "scored" || status.includes("approved")) return "ok";
  if (status.includes("rejected") || status.includes("archived")) return "risk";
  if (status.includes("reformulation") || status.includes("review")) return "warn";
  return "neutral";
}

function priorityTone(priority: string): PillTone {
  if (priority === "Alta") return "risk";
  if (priority === "Media") return "warn";
  return "neutral";
}

function gapCount(demand: DemandRecord) {
  return demand.policy_gaps.length + demand.architecture_gaps.length + demand.finops_gaps.length;
}

function readinessFromDemand(demand: DemandRecord) {
  return Math.max(25, 100 - gapCount(demand) * 12);
}

function fallbackScore(demand: DemandRecord) {
  return Math.max(1, Math.min(5, readinessFromDemand(demand) / 20));
}

function scoreOf(demand: DemandRecord) {
  return demand.scoring?.score ?? fallbackScore(demand);
}

function priorityOf(demand: DemandRecord): PriorityLabel {
  if (demand.scoring?.priority === "Alta" || demand.scoring?.priority === "Media" || demand.scoring?.priority === "Baja") {
    return demand.scoring.priority;
  }
  const score = scoreOf(demand);
  if (score >= 4) return "Alta";
  if (score >= 3) return "Media";
  return "Baja";
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function bucket(value: number, thresholds: [number, number, number, number]) {
  if (value >= thresholds[0]) return 5;
  if (value >= thresholds[1]) return 4;
  if (value >= thresholds[2]) return 3;
  if (value >= thresholds[3]) return 2;
  return 1;
}

function financialScoreFromBusiness(input: BusinessInputs) {
  const roi = bucket(input.roiPercent, [80, 60, 35, 20]);
  const van = bucket(input.vanUsd, [50000, 25000, 10000, 1]);
  const tir = bucket(input.tirPercent, [60, 30, 18, 10]);
  const payback = input.paybackYears <= 1 ? 5 : input.paybackYears <= 2 ? 4 : input.paybackYears <= 3 ? 3 : input.paybackYears <= 5 ? 2 : 1;
  return Math.round(((roi + van + tir + payback) / 4) * 100) / 100;
}

function roundScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function businessFromDemand(demand: DemandRecord | null, fallback: BusinessInputs): BusinessInputs {
  if (!demand?.financials) return fallback;
  return {
    ...fallback,
    roiPercent: demand.financials.roi_percent ?? fallback.roiPercent,
    vanUsd: demand.financials.van_usd ?? fallback.vanUsd,
    tirPercent: demand.financials.tir_percent ?? fallback.tirPercent,
    paybackYears: demand.financials.payback_years ?? fallback.paybackYears
  };
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<ActiveView>("intake");
  const [title, setTitle] = useState("Validación de calidad de clientes para dashboard ejecutivo");
  const [description, setDescription] = useState(
    "Necesitamos integrar datos de clientes desde fuentes operacionales, llevarlos a Bronze, Silver y Gold, crear controles de calidad y publicar un dashboard ejecutivo. Aún no se ha definido cuadratura, modelo semántico ni presupuesto."
  );
  const [targetConsumption, setTargetConsumption] = useState("BI ejecutivo / dashboard");
  const [businessInputs, setBusinessInputs] = useState<BusinessInputs>(defaultBusinessInputs);
  const [businessInputsByDemand, setBusinessInputsByDemand] = useState<Record<string, BusinessInputs>>({});
  const [committeeInputs, setCommitteeInputs] = useState<CommitteeInputs>(defaultCommitteeInputs);
  const [result, setResult] = useState<ValidationResult>(defaultResult);
  const [persistedDemand, setPersistedDemand] = useState<DemandRecord | null>(null);
  const [backlog, setBacklog] = useState<DemandRecord[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [domainFilter, setDomainFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [priorityFilter, setPriorityFilter] = useState("Todas");
  const [mode, setMode] = useState<RuntimeMode>("demo");
  const [connectionMessage, setConnectionMessage] = useState("Esperando validación del requerimiento.");
  const [backlogMessage, setBacklogMessage] = useState("Backlog pendiente de sincronización.");
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);

  const selectedDemand = useMemo(() => backlog.find((item) => item.demand_id === selectedDemandId) ?? persistedDemand, [backlog, persistedDemand, selectedDemandId]);
  const selectedBusinessInputs = selectedDemand ? businessInputsByDemand[selectedDemand.demand_id] ?? businessFromDemand(selectedDemand, businessInputs) : businessInputs;
  const currentFinancialScore = financialScoreFromBusiness(selectedBusinessInputs);

  const areas = useMemo(() => ["Todas", ...Array.from(new Set(backlog.map((item) => item.request.requester_area || "Sin área")))], [backlog]);
  const domains = useMemo(() => ["Todos", ...Array.from(new Set(backlog.map((item) => item.request.domain_hint || "Sin dominio")))], [backlog]);
  const statuses = useMemo(() => ["Todos", ...Array.from(new Set(backlog.map((item) => item.status)))], [backlog]);

  const filteredBacklog = useMemo(() => {
    return backlog.filter((item) => {
      const area = item.request.requester_area || "Sin área";
      const domain = item.request.domain_hint || "Sin dominio";
      const priority = priorityOf(item);
      return (
        (areaFilter === "Todas" || area === areaFilter) &&
        (domainFilter === "Todos" || domain === domainFilter) &&
        (statusFilter === "Todos" || item.status === statusFilter) &&
        (priorityFilter === "Todas" || priority === priorityFilter)
      );
    });
  }, [backlog, areaFilter, domainFilter, statusFilter, priorityFilter]);

  const metrics = useMemo(() => {
    const total = backlog.length;
    const scores = backlog.map(scoreOf);
    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const high = backlog.filter((item) => priorityOf(item) === "Alta").length;
    const medium = backlog.filter((item) => priorityOf(item) === "Media").length;
    const low = backlog.filter((item) => priorityOf(item) === "Baja").length;
    const review = backlog.filter((item) => item.status.includes("review")).length;
    const scored = backlog.filter((item) => item.status === "scored").length;
    const events = backlog.reduce((sum, item) => sum + item.events.length, 0);
    const policyGaps = backlog.reduce((sum, item) => sum + item.policy_gaps.length, 0);
    const architectureGaps = backlog.reduce((sum, item) => sum + item.architecture_gaps.length, 0);
    const finopsGaps = backlog.reduce((sum, item) => sum + item.finops_gaps.length, 0);
    const vanTotal = backlog.reduce((sum, item) => sum + (item.financials?.van_usd ?? 0), 0);
    return { total, averageScore, high, medium, low, review, scored, events, policyGaps, architectureGaps, finopsGaps, vanTotal };
  }, [backlog]);

  const topCases = useMemo(() => [...backlog].sort((left, right) => scoreOf(right) - scoreOf(left)).slice(0, 5), [backlog]);

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

  async function validateRequest() {
    try {
      setMode("loading");
      setConnectionMessage("Validando y registrando solicitud en backlog gobernado...");
      const response = await fetch("/api/intake/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, requester_area: "Negocio", requester_role: "Data Owner", domain_hint: "Clientes", target_consumption: targetConsumption })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Proxy/API validation failed with HTTP ${response.status}: ${responseText}`);
      const payload = JSON.parse(responseText) as PersistedValidationResponse;
      setMode("api");
      setResult(payload.validation);
      setPersistedDemand(payload.demand);
      setSelectedDemandId(payload.demand.demand_id);
      setBusinessInputsByDemand((items) => ({ ...items, [payload.demand.demand_id]: businessInputs }));
      setConnectionMessage(`Solicitud ${payload.demand.demand_id} enviada al Comité Operativo con checklist de valor.`);
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

  async function calculateGovernedScore() {
    if (!selectedDemand) return;
    const business = selectedBusinessInputs;
    const financialScore = financialScoreFromBusiness(business);
    const businessValue = roundScore((business.operationalImpact + business.strategicImpact + financialScore) / 3);
    const technicalFeasibility = roundScore((committeeInputs.technicalFeasibility + committeeInputs.executionEffort + committeeInputs.reusePotential) / 3);

    try {
      setScoreLoading(true);
      const response = await fetch("/api/demands/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demand_id: selectedDemand.demand_id,
          strategic_alignment: business.strategicAlignment,
          business_value: businessValue,
          urgency: business.strategicImpact,
          data_readiness: committeeInputs.dataReadiness,
          governance_risk: 6 - committeeInputs.riskControl,
          technical_feasibility: technicalFeasibility,
          roi_percent: business.roiPercent,
          van_usd: business.vanUsd,
          tir_percent: business.tirPercent,
          payback_years: business.paybackYears,
          operational_impact: business.operationalImpact,
          operational_justification: business.operationalJustification,
          strategic_impact: business.strategicImpact,
          strategic_impact_justification: business.strategicImpactJustification,
          strategic_alignment_justification: business.strategicAlignmentJustification,
          data_readiness_justification: committeeInputs.dataReadinessJustification,
          technical_feasibility_justification: committeeInputs.technicalFeasibilityJustification,
          execution_effort: committeeInputs.executionEffort,
          execution_effort_justification: committeeInputs.executionEffortJustification,
          risk_control: committeeInputs.riskControl,
          risk_control_justification: committeeInputs.riskControlJustification,
          reuse_potential: committeeInputs.reusePotential,
          reuse_potential_justification: committeeInputs.reusePotentialJustification,
          actor: "Data Owner + Comité Operativo",
          comment: "Comité validó el checklist de valor del Data Owner y completó criterios técnicos/gobierno."
        })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Scoring failed with HTTP ${response.status}: ${responseText}`);
      const payload = JSON.parse(responseText) as { demand: DemandRecord };
      setPersistedDemand(payload.demand);
      setSelectedDemandId(payload.demand.demand_id);
      setBacklog((items) => items.map((item) => (item.demand_id === payload.demand.demand_id ? payload.demand : item)));
      setBacklogMessage(`Score actualizado: ${payload.demand.demand_id} → ${payload.demand.scoring?.priority ?? "prioridad calculada"}.`);
      setActiveView("executive");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al calcular scoring.";
      setBacklogMessage(`No se pudo calcular el score: ${message}`);
    } finally {
      setScoreLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="app-hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 09</p>
          <h1>{viewCopy[activeView].title}</h1>
          <p className="hero-copy">{viewCopy[activeView].copy}</p>
        </div>
        <aside className="hero-panel">
          <span>Modo</span>
          <strong>{mode === "api" ? "API conectada" : mode === "loading" ? "Procesando" : mode === "error" ? "Error" : "Demo local"}</strong>
          <button className="secondary-button" onClick={() => void loadBacklog()}>{backlogLoading ? "Actualizando..." : "Actualizar backlog"}</button>
        </aside>
      </section>

      <nav className="view-tabs" aria-label="Vistas de gobierno de demanda">
        <button className={activeView === "intake" ? "tab-active" : ""} onClick={() => setActiveView("intake")}>1 · Intake negocio</button>
        <button className={activeView === "committee" ? "tab-active" : ""} onClick={() => setActiveView("committee")}>2 · Comité operativo</button>
        <button className={activeView === "executive" ? "tab-active" : ""} onClick={() => setActiveView("executive")}>3 · Tablero ejecutivo</button>
      </nav>

      <section className={`status-card status-${mode}`}><strong>Estado de conexión</strong><span>{connectionMessage}</span></section>
      <section className="status-card status-api"><strong>Backlog persistente</strong><span>{backlogMessage}</span></section>

      {activeView === "intake" ? (
        <section className="single-view">
          <article className="card">
            <div className="section-title-row"><div><p className="eyebrow small">Paso 1</p><h2>Nueva solicitud</h2></div><Pill tone="neutral">Usuario / Data Owner</Pill></div>
            <div className="form-grid two-columns">
              <label>Título del requerimiento<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>Consumo esperado<select value={targetConsumption} onChange={(event) => setTargetConsumption(event.target.value)}><option>BI ejecutivo / dashboard</option><option>Machine Learning</option><option>GenAI / RAG / agente</option><option>Streaming / tiempo real</option></select></label>
            </div>
            <label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} /></label>
          </article>

          <article className="card">
            <div className="section-title-row"><div><p className="eyebrow small">Checklist conversacional</p><h2>Valor de negocio y supuestos económicos</h2><p className="muted-copy">Lo completa el Data Owner. El comité validará estos datos antes de calcular el score.</p></div><Pill tone="dark">Score financiero {currentFinancialScore.toFixed(2)}</Pill></div>
            <div className="checklist-grid">
              <label>Impacto operativo<select value={businessInputs.operationalImpact} onChange={(e) => setBusinessInputs({ ...businessInputs, operationalImpact: Number(e.target.value) })}><option value={5}>5 · Ventaja competitiva / transformación</option><option value={4}>4 · Mejora procesos críticos</option><option value={3}>3 · Mejora decisiones relevantes</option><option value={2}>2 · Mejora local o parcial</option><option value={1}>1 · Bajo impacto</option></select><textarea value={businessInputs.operationalJustification} onChange={(e) => setBusinessInputs({ ...businessInputs, operationalJustification: e.target.value })} rows={3} /></label>
              <label>Impacto estratégico<select value={businessInputs.strategicImpact} onChange={(e) => setBusinessInputs({ ...businessInputs, strategicImpact: Number(e.target.value) })}><option value={5}>5 · Crítico para la estrategia</option><option value={4}>4 · Alineado a prioridades estratégicas</option><option value={3}>3 · Mejora decisiones importantes</option><option value={2}>2 · Contribución táctica</option><option value={1}>1 · Bajo impacto estratégico</option></select><textarea value={businessInputs.strategicImpactJustification} onChange={(e) => setBusinessInputs({ ...businessInputs, strategicImpactJustification: e.target.value })} rows={3} /></label>
              <label>ROI esperado (%)<input type="number" value={businessInputs.roiPercent} onChange={(e) => setBusinessInputs({ ...businessInputs, roiPercent: Number(e.target.value) })} /></label>
              <label>VAN esperado ($)<input type="number" value={businessInputs.vanUsd} onChange={(e) => setBusinessInputs({ ...businessInputs, vanUsd: Number(e.target.value) })} /></label>
              <label>TIR esperada (%)<input type="number" value={businessInputs.tirPercent} onChange={(e) => setBusinessInputs({ ...businessInputs, tirPercent: Number(e.target.value) })} /></label>
              <label>Payback esperado (años)<input type="number" step="0.1" value={businessInputs.paybackYears} onChange={(e) => setBusinessInputs({ ...businessInputs, paybackYears: Number(e.target.value) })} /></label>
              <label className="wide-field">Alineamiento estratégico<select value={businessInputs.strategicAlignment} onChange={(e) => setBusinessInputs({ ...businessInputs, strategicAlignment: Number(e.target.value) })}><option value={5}>5 · Alineamiento crítico</option><option value={4}>4 · Alineamiento alto</option><option value={3}>3 · Alineamiento medio</option><option value={2}>2 · Alineamiento bajo</option><option value={1}>1 · No alineado</option></select><textarea value={businessInputs.strategicAlignmentJustification} onChange={(e) => setBusinessInputs({ ...businessInputs, strategicAlignmentJustification: e.target.value })} rows={3} /></label>
            </div>
            <button onClick={validateRequest}>Validar y enviar al Comité Operativo</button>
          </article>
        </section>
      ) : null}

      {activeView === "committee" ? (
        <section className="single-view">
          <article className="card">
            <div className="section-title-row"><div><p className="eyebrow small">CRUD de demanda</p><h2>Grilla de solicitudes</h2></div><Pill tone="neutral">{filteredBacklog.length} visibles / {backlog.length} total</Pill></div>
            <div className="form-grid four-columns">
              <label>Área<select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>{areas.map((area) => <option key={area}>{area}</option>)}</select></label>
              <label>Dominio<select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
              <label>Estado<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Prioridad<select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option>Todas</option><option>Alta</option><option>Media</option><option>Baja</option></select></label>
            </div>
            {filteredBacklog.length ? <div className="table-wrap"><table><thead><tr><th>ID</th><th>Área</th><th>Dominio</th><th>Caso</th><th>Estado</th><th>Prioridad</th><th>Score</th></tr></thead><tbody>{filteredBacklog.map((demand) => <tr key={demand.demand_id} className={selectedDemand?.demand_id === demand.demand_id ? "selected-row" : ""} onClick={() => setSelectedDemandId(demand.demand_id)}><td>{demand.demand_id}</td><td>{demand.request.requester_area}</td><td>{demand.request.domain_hint ?? "Sin dominio"}</td><td><strong>{compact(demand.request.title, 54)}</strong></td><td><Pill tone={statusTone(demand.status)}>{labelize(demand.status)}</Pill></td><td><Pill tone={priorityTone(priorityOf(demand))}>{priorityOf(demand)}</Pill></td><td>{scoreOf(demand).toFixed(2)}</td></tr>)}</tbody></table></div> : <EmptyState title="Sin resultados" copy="Ajusta los filtros o crea una nueva solicitud desde Intake." />}
          </article>

          <article className="card">
            {selectedDemand ? (
              <>
                <div className="section-title-row"><div><p className="eyebrow small">Validación del comité</p><h2>{selectedDemand.demand_id}</h2><p className="muted-copy">El comité valida lo capturado por el Data Owner y completa el bloque técnico/gobierno.</p></div><Pill tone={statusTone(selectedDemand.status)}>{labelize(selectedDemand.status)}</Pill></div>
                <div className="detail-grid">
                  <div><span>Caso</span><strong>{selectedDemand.request.title}</strong></div><div><span>Dominio</span><strong>{selectedDemand.request.domain_hint ?? "Sin dominio"}</strong></div><div><span>Área</span><strong>{selectedDemand.request.requester_area}</strong></div><div><span>Brechas</span><strong>{gapCount(selectedDemand)}</strong></div>
                </div>
                <section className="checklist-panel">
                  <div className="section-title-row"><h3>Datos del Data Owner a validar</h3><Pill tone="dark">Score financiero {currentFinancialScore.toFixed(2)}</Pill></div>
                  <div className="detail-grid"><div><span>Impacto operativo</span><strong>{selectedBusinessInputs.operationalImpact.toFixed(2)}</strong></div><div><span>Impacto estratégico</span><strong>{selectedBusinessInputs.strategicImpact.toFixed(2)}</strong></div><div><span>ROI</span><strong>{selectedBusinessInputs.roiPercent.toFixed(1)}%</strong></div><div><span>VAN</span><strong>${selectedBusinessInputs.vanUsd.toLocaleString("en-US")}</strong></div><div><span>TIR</span><strong>{selectedBusinessInputs.tirPercent.toFixed(1)}%</strong></div><div><span>Payback</span><strong>{selectedBusinessInputs.paybackYears.toFixed(1)} años</strong></div><div><span>Alineamiento</span><strong>{selectedBusinessInputs.strategicAlignment.toFixed(2)}</strong></div></div>
                </section>
                <section className="checklist-panel">
                  <div className="section-title-row"><h3>Checklist que completa el Comité Operativo</h3><Pill tone="warn">Obligatorio para score</Pill></div>
                  <div className="checklist-grid">
                    <label>Disponibilidad / calidad de datos<select value={committeeInputs.dataReadiness} onChange={(e) => setCommitteeInputs({ ...committeeInputs, dataReadiness: Number(e.target.value) })}><option value={5}>5 · Datos listos y gobernados</option><option value={4}>4 · Datos disponibles y trazables</option><option value={3}>3 · Calidad media; requiere limpieza</option><option value={2}>2 · Datos parciales o dispersos</option><option value={1}>1 · Datos no disponibles</option></select><textarea value={committeeInputs.dataReadinessJustification} onChange={(e) => setCommitteeInputs({ ...committeeInputs, dataReadinessJustification: e.target.value })} rows={2} /></label>
                    <label>Viabilidad técnica<select value={committeeInputs.technicalFeasibility} onChange={(e) => setCommitteeInputs({ ...committeeInputs, technicalFeasibility: Number(e.target.value) })}><option value={5}>5 · Muy alta</option><option value={4}>4 · Alta; arquitectura definida</option><option value={3}>3 · Media; requiere diseño adicional</option><option value={2}>2 · Baja; dependencias relevantes</option><option value={1}>1 · No viable</option></select><textarea value={committeeInputs.technicalFeasibilityJustification} onChange={(e) => setCommitteeInputs({ ...committeeInputs, technicalFeasibilityJustification: e.target.value })} rows={2} /></label>
                    <label>Esfuerzo<select value={committeeInputs.executionEffort} onChange={(e) => setCommitteeInputs({ ...committeeInputs, executionEffort: Number(e.target.value) })}><option value={5}>5 · Muy bajo</option><option value={4}>4 · 4 a 6 semanas</option><option value={3}>3 · 6 a 12 semanas</option><option value={2}>2 · Más de 3 meses</option><option value={1}>1 · Muy alto / incierto</option></select><textarea value={committeeInputs.executionEffortJustification} onChange={(e) => setCommitteeInputs({ ...committeeInputs, executionEffortJustification: e.target.value })} rows={2} /></label>
                    <label>Riesgo y control<select value={committeeInputs.riskControl} onChange={(e) => setCommitteeInputs({ ...committeeInputs, riskControl: Number(e.target.value) })}><option value={5}>5 · Riesgo muy bajo</option><option value={4}>4 · Riesgo bajo</option><option value={3}>3 · Riesgo medio mitigable</option><option value={2}>2 · Riesgo alto</option><option value={1}>1 · Riesgo crítico</option></select><textarea value={committeeInputs.riskControlJustification} onChange={(e) => setCommitteeInputs({ ...committeeInputs, riskControlJustification: e.target.value })} rows={2} /></label>
                    <label className="wide-field">Reutilización<select value={committeeInputs.reusePotential} onChange={(e) => setCommitteeInputs({ ...committeeInputs, reusePotential: Number(e.target.value) })}><option value={5}>5 · Muy alta reutilización</option><option value={4}>4 · Alta reutilización</option><option value={3}>3 · Reutilización moderada</option><option value={2}>2 · Baja reutilización</option><option value={1}>1 · Caso aislado</option></select><textarea value={committeeInputs.reusePotentialJustification} onChange={(e) => setCommitteeInputs({ ...committeeInputs, reusePotentialJustification: e.target.value })} rows={2} /></label>
                  </div>
                  <button onClick={calculateGovernedScore} disabled={scoreLoading}>{scoreLoading ? "Calculando score..." : "Validar datos y calcular score"}</button>
                </section>
                <div className="action-row"><button className="ok-button" onClick={() => void updateDemandStatus("approved_for_scoring", "approve_for_scoring", "Aprobado para scoring por Comité Operativo.")} disabled={actionLoading}>Actualizar: aprobar</button><button className="secondary-action" onClick={() => void updateDemandStatus("reformulation_required", "reformulation_required", "Se requiere reformulación antes de continuar.")} disabled={actionLoading}>Actualizar: reformular</button><button className="risk-button" onClick={() => void updateDemandStatus("rejected", "rejected", "Cierre lógico por rechazo del Comité Operativo.")} disabled={actionLoading}>Eliminar lógico</button></div>
                <h3>Timeline auditable</h3><div className="timeline">{selectedDemand.events.map((event) => <div key={event.event_id ?? `${event.timestamp}-${event.type}`}><span>{formatDate(event.timestamp)}</span><strong>{event.type} · {event.actor}</strong><p>{event.comment}</p></div>)}</div>
              </>
            ) : <EmptyState title="Selecciona una solicitud" copy="Usa la grilla CRUD para consultar y actualizar demandas." />}
          </article>
        </section>
      ) : null}

      {activeView === "executive" ? (
        <section className="executive-view">
          <section className="kpi-grid"><KpiCard label="Score promedio" value={metrics.averageScore.toFixed(2)} helper="de 5.00 puntos" tone="dark" /><KpiCard label="Alta prioridad" value={metrics.high} helper="casos críticos" tone="risk" /><KpiCard label="VAN total" value={`$${metrics.vanTotal.toLocaleString("en-US")}`} helper="valor priorizado" tone="ok" /><KpiCard label="Solicitudes" value={metrics.total} helper="demanda registrada" /><KpiCard label="Scored" value={metrics.scored} helper="con score gobernado" /><KpiCard label="Eventos" value={metrics.events} helper="evidencia trazable" /></section>
          <section className="dashboard-grid">
            <article className="card wide-card"><div className="section-title-row"><h2>Top casos prioritarios</h2><Pill tone="dark">Benchmark {benchmarkScore.toFixed(1)}</Pill></div>{topCases.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Caso</th><th>Score</th><th>Prioridad</th><th>VAN</th><th>Estado</th></tr></thead><tbody>{topCases.map((demand, index) => <tr key={demand.demand_id}><td>{index + 1}</td><td><strong>{compact(demand.request.title, 48)}</strong><small>{demand.demand_id}</small></td><td>{scoreOf(demand).toFixed(2)}</td><td><Pill tone={priorityTone(priorityOf(demand))}>{priorityOf(demand)}</Pill></td><td>{demand.financials ? `$${demand.financials.van_usd.toLocaleString("en-US")}` : "Pendiente"}</td><td>{labelize(demand.status)}</td></tr>)}</tbody></table></div> : <EmptyState title="Sin casos" copy="Calcula el score de al menos una demanda." />}</article>
            <article className="card"><h2>Distribución por prioridad</h2>{[["Alta", metrics.high, "risk"], ["Media", metrics.medium, "warn"], ["Baja", metrics.low, "neutral"]].map(([label, value, tone]) => <div className="bar-row" key={String(label)}><span>{label}</span><div><i style={{ width: `${percentage(Number(value), metrics.total)}%` }} /></div><Pill tone={tone as PillTone}>{value}</Pill></div>)}</article>
            <article className="card"><h2>Brechas agregadas</h2><div className="detail-grid"><div><span>Política</span><strong>{metrics.policyGaps}</strong></div><div><span>Arquitectura</span><strong>{metrics.architectureGaps}</strong></div><div><span>FinOps</span><strong>{metrics.finopsGaps}</strong></div></div></article>
          </section>
        </section>
      ) : null}
    </main>
  );
}
