"use client";

import { useMemo, useState } from "react";

type ValidationResult = {
  classification: {
    initiative_type: string;
    confidence: number;
    rationale: string;
  };
  architecture: {
    architecture_pattern: string;
    is_compliant: boolean;
    missing_components: string[];
    architecture_gaps: string[];
    human_architecture_review_required: boolean;
  };
  policy_gaps: string[];
  finops_gaps: string[];
  operative_committee: {
    route: string;
    required_reviewers: string[];
    suggested_decision: string;
    data_architect_final_validation_required: boolean;
  };
  committee_summary: string;
};

type RuntimeMode = "demo" | "api" | "error";

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
    architecture_gaps: [
      "Faltan componentes obligatorios del patrón aprobado: reconciliation, semantic_model, finops.",
      "La arquitectura debe ser validada por el Arquitecto de Datos antes de pasar a scoring."
    ],
    human_architecture_review_required: true
  },
  policy_gaps: [
    "Definir puntos de reconciliación/cuadratura desde ingesta hasta capa Gold/consumo.",
    "Asignar Data Owner y Data Steward antes de Comité Operativo."
  ],
  finops_gaps: [
    "Definir owner de costo, presupuesto, alertas y estrategia de consumo.",
    "Estimar volumen, frecuencia de consulta y estrategia de particionado/clustering."
  ],
  operative_committee: {
    route: "operative_committee_architect_review",
    required_reviewers: ["Data Architect", "Domain Owner", "Data Steward"],
    suggested_decision: "architect_review",
    data_architect_final_validation_required: true
  },
  committee_summary:
    "La solicitud fue estructurada por el intake multiagente. Presenta brechas de arquitectura, gobierno y FinOps que deben ser revisadas en Comité Operativo con validación final del Arquitecto de Datos."
};

const architectureFlow = [
  "Fuentes",
  "Extracción",
  "Landing",
  "Bronze",
  "Silver",
  "Gold",
  "Feature / Knowledge",
  "Serving",
  "BI / ML / GenAI",
  "FinOps"
];

const stageStatus: Record<string, "ok" | "gap" | "review"> = {
  Fuentes: "ok",
  Extracción: "ok",
  Landing: "ok",
  Bronze: "ok",
  Silver: "ok",
  Gold: "ok",
  "Feature / Knowledge": "review",
  Serving: "ok",
  "BI / ML / GenAI": "review",
  FinOps: "gap"
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "risk" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function GapList({ title, items, tone }: { title: string; items: string[]; tone: "warn" | "risk" }) {
  return (
    <article className="card compact">
      <div className="section-title-row">
        <h3>{title}</h3>
        <Pill tone={items.length ? tone : "ok"}>{items.length ? `${items.length} brechas` : "Sin brechas"}</Pill>
      </div>
      <ul className="gap-list">
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No se detectaron brechas en esta categoría.</li>}
      </ul>
    </article>
  );
}

function runtimeLabel(mode: RuntimeMode) {
  if (mode === "api") return "API conectada";
  if (mode === "error") return "Error conexión";
  return "Demo local";
}

export default function HomePage() {
  const [title, setTitle] = useState("Validación de calidad de clientes para dashboard ejecutivo");
  const [description, setDescription] = useState(
    "Necesitamos integrar datos de clientes desde fuentes operacionales, llevarlos a Bronze, Silver y Gold, crear controles de calidad y publicar un dashboard ejecutivo. Aún no se ha definido cuadratura, modelo semántico ni presupuesto."
  );
  const [targetConsumption, setTargetConsumption] = useState("BI ejecutivo / dashboard");
  const [result, setResult] = useState<ValidationResult>(defaultResult);
  const [mode, setMode] = useState<RuntimeMode>("demo");
  const [connectionMessage, setConnectionMessage] = useState("Esperando validación del requerimiento.");

  const readinessScore = useMemo(() => {
    const gaps = result.policy_gaps.length + result.finops_gaps.length + result.architecture.architecture_gaps.length;
    return Math.max(25, 100 - gaps * 12);
  }, [result]);

  async function validateRequest() {
    const baseUrl = process.env.NEXT_PUBLIC_ATLAS_API_BASE;
    if (!baseUrl) {
      setMode("demo");
      setConnectionMessage("Variable NEXT_PUBLIC_ATLAS_API_BASE no configurada. Usando modo demo local.");
      setResult(defaultResult);
      return;
    }
    try {
      setConnectionMessage(`Validando contra ${baseUrl}...`);
      const response = await fetch(`${baseUrl}/intake/policy-architecture-validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          requester_area: "Negocio",
          requester_role: "Domain Owner",
          domain_hint: "Clientes",
          target_consumption: targetConsumption
        })
      });
      if (!response.ok) throw new Error(`API validation failed with HTTP ${response.status}`);
      const payload = (await response.json()) as ValidationResult;
      setMode("api");
      setConnectionMessage(`Conectado correctamente a ${baseUrl}.`);
      setResult(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al conectar con el API.";
      setMode("error");
      setConnectionMessage(`No se pudo conectar con el API: ${message}`);
      setResult(defaultResult);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Sprint 06.1</p>
          <h1>Intake multiagente con validación de políticas y arquitectura</h1>
          <p className="hero-copy">
            Captura el requerimiento, detecta brechas contra políticas, valida la arquitectura canónica Google Cloud y deriva al Comité Operativo con decisión final del Arquitecto de Datos.
          </p>
        </div>
        <div className="hero-badge">
          <span>Modo</span>
          <strong>{runtimeLabel(mode)}</strong>
        </div>
      </section>

      <section className={`status-card status-${mode}`}>
        <strong>Estado de conexión</strong>
        <span>{connectionMessage}</span>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Readiness</span>
          <strong>{readinessScore}%</strong>
          <small>Antes de Comité Operativo</small>
        </article>
        <article className="metric-card">
          <span>Patrón</span>
          <strong>{result.architecture.architecture_pattern}</strong>
          <small>Arquitectura canónica</small>
        </article>
        <article className="metric-card">
          <span>Brechas</span>
          <strong>{result.policy_gaps.length + result.finops_gaps.length + result.architecture.architecture_gaps.length}</strong>
          <small>Política + arquitectura + FinOps</small>
        </article>
        <article className="metric-card">
          <span>Decisión sugerida</span>
          <strong>{result.operative_committee.suggested_decision}</strong>
          <small>Siempre con humano en el loop</small>
        </article>
      </section>

      <section className="main-grid">
        <article className="card intake-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow small">Paso 1</p>
              <h2>Nueva solicitud de negocio</h2>
            </div>
            <Pill tone="neutral">Intake conversation agent</Pill>
          </div>

          <label>
            Título del requerimiento
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Descripción
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={8} />
          </label>
          <label>
            Consumo esperado
            <select value={targetConsumption} onChange={(event) => setTargetConsumption(event.target.value)}>
              <option>BI ejecutivo / dashboard</option>
              <option>Machine Learning</option>
              <option>GenAI / RAG / agente</option>
              <option>Streaming / tiempo real</option>
            </select>
          </label>

          <button onClick={validateRequest}>Validar requerimiento</button>
        </article>

        <article className="card result-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow small">Paso 2</p>
              <h2>Resultado del intake multiagente</h2>
            </div>
            <Pill tone={result.architecture.human_architecture_review_required ? "warn" : "ok"}>
              {result.architecture.human_architecture_review_required ? "Revisión humana" : "Sin alerta crítica"}
            </Pill>
          </div>

          <div className="classification-box">
            <span>Clasificación</span>
            <strong>{result.classification.initiative_type}</strong>
            <p>{result.classification.rationale}</p>
          </div>

          <div className="committee-box">
            <h3>Ruta Comité Operativo</h3>
            <p>{result.committee_summary}</p>
            <div className="reviewers">
              {result.operative_committee.required_reviewers.map((reviewer) => (
                <Pill key={reviewer} tone={reviewer === "Data Architect" ? "risk" : "neutral"}>{reviewer}</Pill>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="architecture-card card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow small">Paso 3</p>
            <h2>Arquitectura end-to-end validada</h2>
          </div>
          <Pill tone={result.architecture.is_compliant ? "ok" : "warn"}>
            {result.architecture.is_compliant ? "Cumple" : "Con brechas"}
          </Pill>
        </div>
        <div className="architecture-flow">
          {architectureFlow.map((stage) => (
            <div className={`stage stage-${stageStatus[stage]}`} key={stage}>
              <span>{stage}</span>
            </div>
          ))}
        </div>
        <p className="note">
          El agente valida contra una arquitectura predefinida por el Arquitecto de Datos. Si aparece un componente no canónico o una capa crítica faltante, deriva a revisión del Comité Operativo.
        </p>
      </section>

      <section className="gaps-grid">
        <GapList title="Brechas de política" items={result.policy_gaps} tone="warn" />
        <GapList title="Brechas de arquitectura" items={result.architecture.architecture_gaps} tone="risk" />
        <GapList title="Brechas FinOps" items={result.finops_gaps} tone="warn" />
      </section>
    </main>
  );
}
