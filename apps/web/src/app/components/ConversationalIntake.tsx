"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ConversationalIntake.module.css";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type ProjectClassification = {
  primary_type?: string;
  subtype?: string;
  agent_type?: string | null;
  secondary_capabilities?: string[];
  confidence?: number;
  signals?: string[];
};

type DataReadiness = {
  score?: number;
  status?: string;
  gaps?: string[];
};

type ArchitectureAssessment = {
  status?: string;
  pattern_id?: string;
  pattern_version?: string;
  pattern_name?: string;
  required_components?: string[];
  gcp_services?: string[];
  gaps?: string[];
  human_architecture_review_required?: boolean;
};

type PolicyAssessment = {
  status?: string;
  policy_references?: string[];
  missing_controls?: string[];
};

type SpecialistActivity = {
  key: "data_readiness" | "architecture" | "policies";
  label: string;
  agent_id: string;
  completed: boolean;
  summary: string;
  execution_mode: "adk_agent" | "runtime_guard" | "session_state" | "not_run";
};

type BusinessCase = {
  business_problem?: string;
  desired_outcome?: string;
  business_area?: string;
  stakeholders?: string[];
  impacted_process?: string;
  current_situation?: string;
  success_metrics?: string[];
  data_sources?: string[];
  project_classification?: ProjectClassification;
  data_readiness?: DataReadiness;
  architecture_assessment?: ArchitectureAssessment;
  policy_assessment?: PolicyAssessment;
  preliminary_risk?: string;
  gaps?: string[];
  recommendation?: string;
  completeness?: number;
  ready_to_register?: boolean;
};

type IntakeResponse = {
  session_id: string;
  message: string;
  business_case: BusinessCase;
  project_classification: ProjectClassification;
  data_readiness: DataReadiness;
  architecture_assessment: ArchitectureAssessment;
  policy_assessment: PolicyAssessment;
  agent_trace: string[];
  specialist_activity?: SpecialistActivity[];
};

type CatalogSnapshot = {
  source?: string;
  bucket?: string | null;
  prefix?: string;
  policy_count?: number;
  architecture_pattern_count?: number;
};

type RegisterResponse = {
  demand?: { demand_id?: string; status?: string };
};

const starterPrompts = [
  "Tenemos un problema de negocio y necesito ayuda para convertirlo en un proyecto de datos.",
  "Quiero anticipar un resultado futuro usando nuestros datos históricos.",
  "Necesitamos automatizar un proceso y no sabemos si corresponde un agente de IA."
];

function label(value?: string | null) {
  if (!value) return "Pendiente";
  return value.replaceAll("_", " ");
}

function executionModeLabel(mode: SpecialistActivity["execution_mode"]) {
  if (mode === "adk_agent") return "Especialista ADK";
  if (mode === "runtime_guard") return "Validación garantizada por ATLAS";
  if (mode === "session_state") return "Resultado vigente de la sesión";
  return "Aún no requerido";
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ConversationalIntake() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Cuéntame qué necesidad de negocio quieres resolver. No necesitas saber si es Data Engineering, Machine Learning, un tablero o un agente: yo te ayudaré a definirlo y validaré los datos, la arquitectura GCP y las políticas cuando corresponda."
    }
  ]);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [businessCase, setBusinessCase] = useState<BusinessCase>({});
  const [classification, setClassification] = useState<ProjectClassification>({});
  const [dataReadiness, setDataReadiness] = useState<DataReadiness>({});
  const [architecture, setArchitecture] = useState<ArchitectureAssessment>({});
  const [policies, setPolicies] = useState<PolicyAssessment>({});
  const [agentTrace, setAgentTrace] = useState<string[]>([]);
  const [specialistActivity, setSpecialistActivity] = useState<SpecialistActivity[]>([]);
  const [catalog, setCatalog] = useState<CatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [registeredDemandId, setRegisteredDemandId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const completeness = businessCase.completeness ?? 0;
  const ready = Boolean(businessCase.ready_to_register);

  const visibleGaps = useMemo(
    () => (businessCase.gaps ?? []).filter(Boolean).slice(0, 6),
    [businessCase.gaps]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/intake/governance-catalog", { cache: "no-store" });
        if (!response.ok) return;
        setCatalog((await response.json()) as CatalogSnapshot);
      } catch {
        // Catalog readiness is informative; the conversation endpoint reports hard runtime errors.
      }
    })();
  }, []);

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;

    setError("");
    setRegisteredDemandId(null);
    setMessages((current) => [...current, { id: messageId(), role: "user", text: clean }]);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetch("/api/intake/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, session_id: sessionId })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText}`);

      const payload = JSON.parse(responseText) as IntakeResponse;
      setSessionId(payload.session_id);
      setBusinessCase(payload.business_case ?? {});
      setClassification(payload.project_classification ?? {});
      setDataReadiness(payload.data_readiness ?? {});
      setArchitecture(payload.architecture_assessment ?? {});
      setPolicies(payload.policy_assessment ?? {});
      setAgentTrace(payload.agent_trace ?? []);
      setSpecialistActivity(payload.specialist_activity ?? []);
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: payload.message || "He actualizado el caso de negocio. Continuemos refinándolo."
        }
      ]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo continuar la conversación.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await sendMessage(draft);
  }

  async function registerBusinessCase() {
    if (!sessionId || !ready || registering) return;

    const confirmed = window.confirm(
      "¿Confirmas que este Caso de Negocio representa correctamente tu necesidad y deseas registrarlo como requerimiento formal?"
    );
    if (!confirmed) return;

    setRegistering(true);
    setError("");
    try {
      const response = await fetch("/api/intake/business-case/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, confirmed: true })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as RegisterResponse;
      const demandId = payload.demand?.demand_id;
      if (!demandId) throw new Error("El backend no devolvió el identificador del requerimiento registrado.");
      setRegisteredDemandId(demandId);
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: `Caso de Negocio confirmado y registrado como ${demandId}. Desde aquí continúa el flujo gobernado de evaluación, comité y scoring.`
        }
      ]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo registrar el Caso de Negocio.";
      setError(message);
    } finally {
      setRegistering(false);
    }
  }

  function resetConversation() {
    if (messages.length > 1 && !window.confirm("¿Iniciar una nueva conversación? El caso actual dejará de mostrarse en esta pantalla.")) {
      return;
    }
    setSessionId(null);
    setBusinessCase({});
    setClassification({});
    setDataReadiness({});
    setArchitecture({});
    setPolicies({});
    setAgentTrace([]);
    setSpecialistActivity([]);
    setRegisteredDemandId(null);
    setError("");
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        text: "Empecemos de nuevo. ¿Qué problema u oportunidad de negocio quieres resolver?"
      }
    ]);
  }

  return (
    <section className={styles.shell} aria-label="ATLAS Conversational Governed Intake">
      <div className={styles.chatPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Gemini ADK · Conversational Governed Intake</p>
            <h2>Define tu necesidad conversando</h2>
            <p>ATLAS pregunta, estructura y consulta especialistas solo cuando aporta valor.</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={resetConversation}>
            Nueva conversación
          </button>
        </div>

        <div className={styles.runtimeStrip}>
          <span className={catalog ? styles.okDot : styles.neutralDot} aria-hidden="true" />
          <strong>{catalog ? "Gobierno disponible" : "Validando catálogo"}</strong>
          {catalog ? (
            <small>
              {catalog.policy_count ?? 0} políticas · {catalog.architecture_pattern_count ?? 0} patrones · {catalog.source === "gcs" ? "Cloud Storage" : "JSON local"}
            </small>
          ) : null}
        </div>

        {(specialistActivity.length || loading) ? (
          <section className={styles.specialistPanel} aria-label="Especialistas ATLAS">
            <div className={styles.specialistHeader}>
              <div>
                <span>Evaluación gobernada</span>
                <strong>{loading ? "ATLAS está seleccionando especialistas…" : "Especialistas ATLAS"}</strong>
              </div>
              {!loading ? <small>Solo se ejecutan cuando existe información suficiente.</small> : null}
            </div>
            <div className={styles.specialistGrid}>
              {specialistActivity.map((activity) => (
                <article
                  key={activity.key}
                  className={activity.completed ? styles.specialistComplete : styles.specialistPending}
                >
                  <div className={styles.specialistStatus} aria-hidden="true">
                    {activity.completed ? "✓" : "○"}
                  </div>
                  <div>
                    <strong>{activity.label}</strong>
                    <span>{activity.completed ? activity.summary : "Aún no requerido"}</span>
                    <small>{executionModeLabel(activity.execution_mode)}</small>
                  </div>
                </article>
              ))}
              {loading && !specialistActivity.length ? (
                <article className={styles.specialistWorking}>
                  <div className={styles.specialistStatus} aria-hidden="true">●</div>
                  <div>
                    <strong>Orquestador ATLAS</strong>
                    <span>Interpretando la necesidad y determinando qué validaciones corresponden.</span>
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className={styles.transcript} aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageRow} ${message.role === "user" ? styles.userRow : styles.assistantRow}`}
            >
              <div className={styles.avatar}>{message.role === "user" ? "Tú" : "A"}</div>
              <div className={styles.bubble}>
                <span>{message.role === "user" ? "Usuario de negocio" : "ATLAS"}</span>
                <p>{message.text}</p>
              </div>
            </div>
          ))}
          {loading ? (
            <div className={`${styles.messageRow} ${styles.assistantRow}`}>
              <div className={styles.avatar}>A</div>
              <div className={styles.bubble}>
                <span>ATLAS</span>
                <p>Estoy analizando lo que me cuentas y consultando al especialista que corresponda…</p>
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {messages.length === 1 ? (
          <div className={styles.starters}>
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <form className={styles.composer} onSubmit={onSubmit}>
          <label htmlFor="atlas-intake-message">Describe tu necesidad o responde la pregunta de ATLAS</label>
          <div className={styles.composerRow}>
            <textarea
              id="atlas-intake-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ej.: Hoy detectamos los quiebres de stock demasiado tarde y queremos anticiparnos usando SAP e inventarios…"
              rows={3}
              disabled={loading}
            />
            <button type="submit" disabled={loading || draft.trim().length < 2}>
              {loading ? "Analizando…" : "Enviar"}
            </button>
          </div>
          <small>No necesitas definir tecnología ni tipo de proyecto. ATLAS te guiará.</small>
        </form>

        {error ? <div className={styles.errorBox}>No se pudo continuar: {error}</div> : null}
      </div>

      <aside className={styles.casePanel}>
        <div className={styles.caseHeader}>
          <div>
            <p className={styles.eyebrow}>Artefacto canónico</p>
            <h2>Caso de Negocio</h2>
          </div>
          <div className={styles.completeness}>
            <strong>{completeness}%</strong>
            <span>definido</span>
          </div>
        </div>

        <div className={styles.progressTrack} aria-label={`Caso de Negocio ${completeness}% completo`}>
          <div className={styles.progressValue} style={{ width: `${Math.max(0, Math.min(100, completeness))}%` }} />
        </div>

        <div className={styles.factGrid}>
          <div>
            <span>Tipo de iniciativa</span>
            <strong>{label(classification.primary_type || businessCase.project_classification?.primary_type)}</strong>
          </div>
          <div>
            <span>Subtipo</span>
            <strong>{label(classification.subtype || businessCase.project_classification?.subtype)}</strong>
          </div>
          {(classification.agent_type || businessCase.project_classification?.agent_type) ? (
            <div>
              <span>Tipo de agente</span>
              <strong>{label(classification.agent_type || businessCase.project_classification?.agent_type)}</strong>
            </div>
          ) : null}
          <div>
            <span>Data Readiness</span>
            <strong>{typeof dataReadiness.score === "number" ? `${dataReadiness.score}% · ${label(dataReadiness.status)}` : "Pendiente"}</strong>
          </div>
          <div>
            <span>Arquitectura GCP</span>
            <strong>{architecture.pattern_id ? `${architecture.pattern_id} · ${architecture.pattern_version ?? ""}` : "Pendiente"}</strong>
          </div>
          <div>
            <span>Riesgo preliminar</span>
            <strong>{label(businessCase.preliminary_risk)}</strong>
          </div>
        </div>

        <div className={styles.caseBlock}>
          <span>Problema</span>
          <p>{businessCase.business_problem || "ATLAS lo estructurará durante la conversación."}</p>
        </div>
        <div className={styles.caseBlock}>
          <span>Resultado esperado</span>
          <p>{businessCase.desired_outcome || "Pendiente de definición."}</p>
        </div>

        <div className={styles.caseBlock}>
          <span>Políticas aplicables</span>
          <div className={styles.tags}>
            {(policies.policy_references ?? []).length ? (
              policies.policy_references?.map((item) => <code key={item}>{item}</code>)
            ) : (
              <small>Pendiente de evaluación por Policy & Controls Agent.</small>
            )}
          </div>
        </div>

        <div className={styles.caseBlock}>
          <span>Brechas conocidas</span>
          {visibleGaps.length ? (
            <ul>
              {visibleGaps.map((gap) => <li key={gap}>{label(gap)}</li>)}
            </ul>
          ) : (
            <p>{completeness ? "Sin brechas adicionales registradas en este momento." : "Se identificarán durante la conversación."}</p>
          )}
        </div>

        {(agentTrace.length || specialistActivity.length) ? (
          <details className={styles.trace}>
            <summary>Ver trazabilidad técnica</summary>
            {specialistActivity.length ? (
              <div className={styles.traceSpecialists}>
                {specialistActivity.filter((item) => item.completed).map((item) => (
                  <div key={item.key}>
                    <strong>{item.label}</strong>
                    <span>{item.summary}</span>
                    <code>{item.agent_id}</code>
                    <small>{executionModeLabel(item.execution_mode)}</small>
                  </div>
                ))}
              </div>
            ) : null}
            {agentTrace.length ? (
              <>
                <strong className={styles.traceLabel}>Trace ADK del turno</strong>
                <ul>{agentTrace.map((agent) => <li key={agent}>{agent}</li>)}</ul>
              </>
            ) : null}
          </details>
        ) : null}

        <div className={ready ? styles.readyBox : styles.pendingBox}>
          <strong>{ready ? "Listo para confirmación" : "Seguimos definiendo"}</strong>
          <p>
            {ready
              ? "El Caso de Negocio está estructurado. Tú decides cuándo convertirlo en un requerimiento formal."
              : "ATLAS seguirá haciendo preguntas hasta completar la información necesaria para registrar el requerimiento."}
          </p>
        </div>

        <button
          className={styles.registerButton}
          type="button"
          disabled={!ready || !sessionId || registering || Boolean(registeredDemandId)}
          onClick={() => void registerBusinessCase()}
        >
          {registeredDemandId
            ? `Registrado · ${registeredDemandId}`
            : registering
              ? "Registrando…"
              : "Confirmar y registrar requerimiento"}
        </button>
        {!ready ? <small className={styles.registerHint}>El registro se habilita cuando el Business Case alcanza su Definition of Ready.</small> : null}
      </aside>
    </section>
  );
}
