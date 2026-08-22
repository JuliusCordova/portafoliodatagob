"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Summary = {
  deployments_adk: number;
  deployments_unbound: number;
  governed_agents: number;
  governed_compliant: number;
  not_assessed: number;
  action_required: number;
  high_risk: number;
  open_findings: number;
  last_observed_at?: string | null;
};

type Deployment = {
  deployment_id: string;
  provider_deployment_id: string;
  display_name: string;
  framework: string;
  service_account?: string | null;
  deployment_source_kind?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
  binding_status: string;
  governed_agent_id?: string | null;
  discovery_status?: string;
};

type Finding = {
  finding_id: string;
  title: string;
  severity: string;
  status: string;
  policy_id?: string | null;
  policy_version?: string | null;
};

type Binding = {
  binding_id: string;
  deployment_id: string;
  environment?: string | null;
  is_current?: boolean;
  bound_at?: string;
};

type GovernanceProfile = {
  business_owner?: string | null;
  technical_owner?: string | null;
  business_purpose?: string | null;
  business_area?: string | null;
  environment?: string | null;
  business_criticality?: string | null;
  autonomy_level?: string | null;
  risk_level?: string | null;
  data_classification?: string[];
  human_oversight?: string | null;
  writes_to_systems?: boolean | null;
  applicable_policies?: string[];
  required_controls?: string[];
  governance_status?: string;
  last_assessed_at?: string | null;
  next_review_at?: string | null;
  last_assessment?: { score?: number; checks?: Record<string, boolean>; policy_refs?: string[] };
  notes?: string | null;
};

type GovernedAgent = {
  agent_id: string;
  canonical_name: string;
  description?: string | null;
  governance_status: string;
  governance_profile?: GovernanceProfile;
  bindings?: Binding[];
  deployments?: Deployment[];
  findings?: Finding[];
  updated_at?: string;
};

type Tab = "agents" | "deployments";

type Drawer =
  | { kind: "deployment"; deployment: Deployment }
  | { kind: "agent"; agentId: string }
  | null;

const emptySummary: Summary = {
  deployments_adk: 0,
  deployments_unbound: 0,
  governed_agents: 0,
  governed_compliant: 0,
  not_assessed: 0,
  action_required: 0,
  high_risk: 0,
  open_findings: 0
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/agent-governance/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : JSON.stringify(payload?.detail ?? payload);
    throw new Error(detail || `${response.status} ${response.statusText}`);
  }
  return payload as T;
}

function humanDate(value?: string | null) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function statusLabel(value?: string | null) {
  return (value || "not_assessed").replaceAll("_", " ");
}

export default function AgentGovernancePage() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [agents, setAgents] = useState<GovernedAgent[]>([]);
  const [tab, setTab] = useState<Tab>("agents");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [agentDetail, setAgentDetail] = useState<GovernedAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("Cargando estate de agentes ADK...");
  const [error, setError] = useState<string | null>(null);
  const [deploymentFilter, setDeploymentFilter] = useState<"all" | "unbound">("all");

  const load = useCallback(async () => {
    setError(null);
    const [summaryPayload, deploymentPayload, agentPayload] = await Promise.all([
      api<Summary>("summary"),
      api<{ deployments: Deployment[] }>("deployments"),
      api<{ agents: GovernedAgent[] }>("agents")
    ]);
    setSummary(summaryPayload);
    setDeployments(deploymentPayload.deployments ?? []);
    setAgents(agentPayload.agents ?? []);
    setMessage(`Estate sincronizado · ${summaryPayload.deployments_adk} deployments ADK observados`);
  }, []);

  useEffect(() => {
    let mounted = true;
    void load()
      .catch((reason) => mounted && setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [load]);

  useEffect(() => {
    if (drawer?.kind !== "agent") {
      setAgentDetail(null);
      return;
    }
    void api<{ agent: GovernedAgent }>(`agents/${encodeURIComponent(drawer.agentId)}`)
      .then((payload) => setAgentDetail(payload.agent))
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [drawer]);

  const visibleDeployments = useMemo(
    () =>
      deploymentFilter === "unbound"
        ? deployments.filter((item) => item.binding_status !== "bound")
        : deployments,
    [deployments, deploymentFilter]
  );

  async function refreshDiscovery() {
    setRefreshing(true);
    setError(null);
    setMessage("Consultando Agent Platform en modo read-only...");
    try {
      const result = await api<{ total_google_adk: number; inserted: number; updated: number }>("discovery/refresh", {
        method: "POST"
      });
      await load();
      setMessage(
        `Discovery PASS · ${result.total_google_adk} ADK · ${result.inserted} nuevos · ${result.updated} actualizados`
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setRefreshing(false);
    }
  }

  function showUnbound() {
    setTab("deployments");
    setDeploymentFilter("unbound");
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>ATLAS · GOBIERNO DE AGENTES</span>
          <h1>Gobierno del ecosistema de agentes Google ADK</h1>
          <p>
            Descubre deployments desde Agent Platform y gobierna la identidad lógica del agente sin modificar,
            instrumentar ni interceptar su ejecución.
          </p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.sync}>{message}</span>
          <button className={styles.primaryButton} onClick={refreshDiscovery} disabled={refreshing}>
            {refreshing ? "Actualizando..." : "Actualizar inventario"}
          </button>
        </div>
      </header>

      {error ? <div className={styles.errorBanner}>No se pudo completar la operación: {error}</div> : null}

      <section className={styles.kpiGrid} aria-label="Indicadores de Gobierno de Agentes">
        <button className={styles.kpiCard} onClick={() => { setTab("deployments"); setDeploymentFilter("all"); }}>
          <span>Deployments ADK</span><strong>{summary.deployments_adk}</strong><small>Reasoning Engines observados</small>
        </button>
        <button className={styles.kpiCard} onClick={showUnbound}>
          <span>Sin asociar</span><strong>{summary.deployments_unbound}</strong><small>Requieren identidad gobernada</small>
        </button>
        <button className={styles.kpiCard} onClick={() => setTab("agents")}>
          <span>Agentes gobernados</span><strong>{summary.governed_agents}</strong><small>{summary.governed_compliant} conformes</small>
        </button>
        <button className={styles.kpiCard} onClick={() => setTab("agents")}>
          <span>Alto riesgo</span><strong>{summary.high_risk}</strong><small>High + Critical</small>
        </button>
        <button className={styles.kpiCard} onClick={() => setTab("agents")}>
          <span>Hallazgos abiertos</span><strong>{summary.open_findings}</strong><small>{summary.action_required} agentes requieren acción</small>
        </button>
        <button className={styles.kpiCard} onClick={() => setTab("agents")}>
          <span>No evaluados</span><strong>{summary.not_assessed}</strong><small>Assessment pendiente</small>
        </button>
      </section>

      <section className={styles.controlPanel}>
        <div className={styles.tabs} role="tablist" aria-label="Vista del estate agéntico">
          <button className={tab === "agents" ? styles.activeTab : ""} onClick={() => setTab("agents")}>
            Agentes
          </button>
          <button className={tab === "deployments" ? styles.activeTab : ""} onClick={() => setTab("deployments")}>
            Deployments
          </button>
        </div>
        <div className={styles.contextLine}>
          <strong>{tab === "agents" ? "Identidades lógicas gobernadas" : "Recursos ADK observados"}</strong>
          <span>
            {tab === "agents"
              ? "Riesgo, ownership, autonomía, políticas y evidencia pertenecen a esta identidad."
              : "Un deployment no se convierte automáticamente en un agente lógico."}
          </span>
        </div>
      </section>

      {loading ? <div className={styles.emptyState}>Cargando...</div> : null}

      {!loading && tab === "deployments" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><h2>Deployments ADK</h2><p>Fuente read-only: Google Agent Platform / Reasoning Engines.</p></div>
            <label className={styles.filterLabel}>
              Vista
              <select value={deploymentFilter} onChange={(event) => setDeploymentFilter(event.target.value as "all" | "unbound")}>
                <option value="all">Todos</option>
                <option value="unbound">Sin asociar</option>
              </select>
            </label>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Deployment</th><th>Framework</th><th>Service Account</th><th>Source</th><th>Binding</th><th>Última observación</th></tr></thead>
              <tbody>
                {visibleDeployments.map((item) => (
                  <tr key={item.deployment_id} onClick={() => setDrawer({ kind: "deployment", deployment: item })}>
                    <td><strong>{item.display_name}</strong><small>{item.provider_deployment_id}</small></td>
                    <td><span className={styles.chip}>Google ADK</span></td>
                    <td>{item.service_account ?? "No disponible"}</td>
                    <td>{item.deployment_source_kind ?? "No disponible"}</td>
                    <td><span className={`${styles.statusChip} ${item.binding_status === "bound" ? styles.good : styles.warn}`}>{statusLabel(item.binding_status)}</span></td>
                    <td>{humanDate(item.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visibleDeployments.length ? <div className={styles.emptyState}>No hay deployments para este filtro.</div> : null}
        </section>
      ) : null}

      {!loading && tab === "agents" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><h2>Agent Estate gobernado</h2><p>Una identidad lógica puede tener múltiples deployments históricos o candidatos.</p></div>
            <span className={styles.softBadge}>{agents.length} identidades</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Agente</th><th>Gobierno</th><th>Owner</th><th>Riesgo</th><th>Autonomía</th><th>Deployments</th><th>Última actualización</th></tr></thead>
              <tbody>
                {agents.map((agent) => {
                  const profile = agent.governance_profile ?? {};
                  return (
                    <tr key={agent.agent_id} onClick={() => setDrawer({ kind: "agent", agentId: agent.agent_id })}>
                      <td><strong>{agent.canonical_name}</strong><small>{agent.agent_id}</small></td>
                      <td><span className={`${styles.statusChip} ${profile.governance_status === "governed" ? styles.good : styles.warn}`}>{statusLabel(profile.governance_status)}</span></td>
                      <td>{profile.business_owner ?? "No evaluado"}</td>
                      <td>{statusLabel(profile.risk_level)}</td>
                      <td>{statusLabel(profile.autonomy_level)}</td>
                      <td>{agent.deployments?.length ?? agent.bindings?.length ?? 0}</td>
                      <td>{humanDate(agent.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!agents.length ? (
            <div className={styles.emptyState}>
              <strong>Aún no existen identidades gobernadas.</strong>
              <span>Abre un deployment y crea o asocia su identidad lógica; ATLAS no lo hará por heurística.</span>
              <button className={styles.secondaryButton} onClick={showUnbound}>Ver deployments sin asociar</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {drawer ? <div className={styles.backdrop} onClick={() => setDrawer(null)} /> : null}
      {drawer?.kind === "deployment" ? (
        <DeploymentDrawer
          deployment={drawer.deployment}
          agents={agents}
          onClose={() => setDrawer(null)}
          onChanged={async (agentId) => {
            await load();
            setDrawer({ kind: "agent", agentId });
          }}
        />
      ) : null}
      {drawer?.kind === "agent" ? (
        <AgentDrawer
          agent={agentDetail}
          onClose={() => setDrawer(null)}
          onChanged={async () => {
            await load();
            const payload = await api<{ agent: GovernedAgent }>(`agents/${encodeURIComponent(drawer.agentId)}`);
            setAgentDetail(payload.agent);
          }}
        />
      ) : null}
    </main>
  );
}

function DeploymentDrawer({
  deployment,
  agents,
  onClose,
  onChanged
}: {
  deployment: Deployment;
  agents: GovernedAgent[];
  onClose: () => void;
  onChanged: (agentId: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"existing" | "new">(agents.length ? "existing" : "new");
  const [agentId, setAgentId] = useState(agents[0]?.agent_id ?? "");
  const [canonicalName, setCanonicalName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function associate() {
    setBusy(true);
    setError(null);
    try {
      let targetAgentId = agentId;
      if (mode === "new") {
        const created = await api<{ agent: GovernedAgent }>("agents", {
          method: "POST",
          body: JSON.stringify({ canonical_name: canonicalName, description: description || null })
        });
        targetAgentId = created.agent.agent_id;
      }
      if (!targetAgentId) throw new Error("Selecciona o crea una identidad gobernada.");
      await api(`agents/${encodeURIComponent(targetAgentId)}/deployments/bind`, {
        method: "POST",
        body: JSON.stringify({
          deployment_id: deployment.deployment_id,
          environment: environment || null,
          is_current: isCurrent
        })
      });
      await onChanged(targetAgentId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={styles.drawer} aria-label="Detalle de deployment">
      <DrawerHeader eyebrow="Deployment ADK observado" title={deployment.display_name} onClose={onClose} />
      <div className={styles.drawerBody}>
        <div className={styles.detailGrid}>
          <Metric label="Provider ID" value={deployment.provider_deployment_id} />
          <Metric label="Framework" value="Google ADK" />
          <Metric label="Service Account" value={deployment.service_account ?? "No disponible"} />
          <Metric label="Source" value={deployment.deployment_source_kind ?? "No disponible"} />
          <Metric label="Creado" value={humanDate(deployment.created_at)} />
          <Metric label="Binding" value={statusLabel(deployment.binding_status)} />
        </div>
        {deployment.binding_status === "bound" ? (
          <div className={styles.calloutGood}>Asociado a {deployment.governed_agent_id}. El gobierno se administra en la identidad lógica.</div>
        ) : (
          <section className={styles.formSection}>
            <h3>Resolver identidad gobernada</h3>
            <p>ATLAS no deduce automáticamente qué candidatos pertenecen al mismo agente.</p>
            <div className={styles.segmented}>
              <button className={mode === "existing" ? styles.selected : ""} disabled={!agents.length} onClick={() => setMode("existing")}>Asociar existente</button>
              <button className={mode === "new" ? styles.selected : ""} onClick={() => setMode("new")}>Crear identidad</button>
            </div>
            {mode === "existing" ? (
              <label>Agente gobernado<select value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.canonical_name}</option>)}</select></label>
            ) : (
              <>
                <label>Nombre canónico<input value={canonicalName} onChange={(event) => setCanonicalName(event.target.value)} placeholder="Ej. Ayniq IaC Agent" /></label>
                <label>Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Propósito técnico/funcional breve" /></label>
              </>
            )}
            <label>Ambiente declarado<select value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="">No declarado</option><option value="development">Development</option><option value="qa">QA</option><option value="production">Production</option></select></label>
            <label className={styles.checkbox}><input type="checkbox" checked={isCurrent} onChange={(event) => setIsCurrent(event.target.checked)} />Marcar como deployment vigente de esta identidad</label>
            {error ? <div className={styles.inlineError}>{error}</div> : null}
            <button className={styles.primaryButton} disabled={busy || (mode === "new" && canonicalName.trim().length < 3)} onClick={associate}>{busy ? "Guardando..." : "Confirmar asociación"}</button>
          </section>
        )}
      </div>
    </aside>
  );
}

function AgentDrawer({ agent, onClose, onChanged }: { agent: GovernedAgent | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const profile = agent?.governance_profile ?? {};
  const [form, setForm] = useState<Record<string, string>>({});
  const [writesToSystems, setWritesToSystems] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    setForm({
      business_owner: profile.business_owner ?? "",
      technical_owner: profile.technical_owner ?? "",
      business_purpose: profile.business_purpose ?? "",
      business_area: profile.business_area ?? "",
      environment: profile.environment ?? "",
      business_criticality: profile.business_criticality ?? "not_assessed",
      autonomy_level: profile.autonomy_level ?? "not_assessed",
      risk_level: profile.risk_level ?? "not_assessed",
      data_classification: (profile.data_classification ?? []).join(", "),
      human_oversight: profile.human_oversight ?? "not_assessed",
      required_controls: (profile.required_controls ?? []).join(", "),
      next_review_at: profile.next_review_at?.slice(0, 10) ?? "",
      notes: profile.notes ?? ""
    });
    setWritesToSystems(profile.writes_to_systems === true ? "true" : profile.writes_to_systems === false ? "false" : "");
  }, [agent]);

  if (!agent) {
    return <aside className={styles.drawer}><DrawerHeader eyebrow="Agente gobernado" title="Cargando..." onClose={onClose} /></aside>;
  }

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    setBusy(true); setError(null);
    try {
      await api(`agents/${encodeURIComponent(agent.agent_id)}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          business_owner: form.business_owner || null,
          technical_owner: form.technical_owner || null,
          business_purpose: form.business_purpose || null,
          business_area: form.business_area || null,
          environment: form.environment || null,
          business_criticality: form.business_criticality,
          autonomy_level: form.autonomy_level,
          risk_level: form.risk_level,
          data_classification: form.data_classification.split(",").map((item) => item.trim()).filter(Boolean),
          human_oversight: form.human_oversight,
          writes_to_systems: writesToSystems === "" ? null : writesToSystems === "true",
          required_controls: form.required_controls.split(",").map((item) => item.trim()).filter(Boolean),
          next_review_at: form.next_review_at ? `${form.next_review_at}T23:59:59+00:00` : null,
          notes: form.notes || null
        })
      });
      await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  async function assess() {
    setBusy(true); setError(null);
    try {
      await api(`agents/${encodeURIComponent(agent.agent_id)}/assess`, { method: "POST" });
      await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  return (
    <aside className={styles.drawer} aria-label="Detalle de agente gobernado">
      <DrawerHeader eyebrow={agent.agent_id} title={agent.canonical_name} onClose={onClose} />
      <div className={styles.drawerBody}>
        <div className={styles.detailGrid}>
          <Metric label="Gobierno" value={statusLabel(profile.governance_status)} />
          <Metric label="Risk" value={statusLabel(profile.risk_level)} />
          <Metric label="Autonomía" value={statusLabel(profile.autonomy_level)} />
          <Metric label="Score" value={profile.last_assessment?.score != null ? `${profile.last_assessment.score}%` : "No evaluado"} />
          <Metric label="Deployments" value={String(agent.deployments?.length ?? 0)} />
          <Metric label="Findings" value={String(agent.findings?.filter((item) => item.status === "open").length ?? 0)} />
        </div>

        <section className={styles.formSection}>
          <h3>Perfil de gobierno</h3>
          <div className={styles.twoColumns}>
            <label>Business Owner<input value={form.business_owner ?? ""} onChange={(event) => setField("business_owner", event.target.value)} /></label>
            <label>Technical Owner<input value={form.technical_owner ?? ""} onChange={(event) => setField("technical_owner", event.target.value)} /></label>
          </div>
          <label>Propósito de negocio<textarea value={form.business_purpose ?? ""} onChange={(event) => setField("business_purpose", event.target.value)} /></label>
          <div className={styles.twoColumns}>
            <label>Área<input value={form.business_area ?? ""} onChange={(event) => setField("business_area", event.target.value)} /></label>
            <label>Ambiente<input value={form.environment ?? ""} onChange={(event) => setField("environment", event.target.value)} /></label>
            <label>Criticidad<select value={form.business_criticality ?? "not_assessed"} onChange={(event) => setField("business_criticality", event.target.value)}><option value="not_assessed">No evaluado</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label>Riesgo<select value={form.risk_level ?? "not_assessed"} onChange={(event) => setField("risk_level", event.target.value)}><option value="not_assessed">No evaluado</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label>Autonomía<select value={form.autonomy_level ?? "not_assessed"} onChange={(event) => setField("autonomy_level", event.target.value)}><option value="not_assessed">No evaluado</option><option value="l0">L0 · Inform</option><option value="l1">L1 · Recommend</option><option value="l2">L2 · Prepare</option><option value="l3">L3 · Execute bounded</option><option value="l4">L4 · Autonomous</option></select></label>
            <label>Supervisión humana<select value={form.human_oversight ?? "not_assessed"} onChange={(event) => setField("human_oversight", event.target.value)}><option value="not_assessed">No evaluado</option><option value="required">Required</option><option value="conditional">Conditional</option><option value="not_required">Not required</option></select></label>
            <label>Escribe en sistemas<select value={writesToSystems} onChange={(event) => setWritesToSystems(event.target.value)}><option value="">No evaluado</option><option value="false">No</option><option value="true">Sí</option></select></label>
            <label>Próxima revisión<input type="date" value={form.next_review_at ?? ""} onChange={(event) => setField("next_review_at", event.target.value)} /></label>
          </div>
          <label>Clasificación de datos<input value={form.data_classification ?? ""} onChange={(event) => setField("data_classification", event.target.value)} placeholder="internal, confidential, pii" /></label>
          <label>Controles con evidencia<input value={form.required_controls ?? ""} onChange={(event) => setField("required_controls", event.target.value)} placeholder="Separados por coma" /></label>
          <label>Notas<textarea value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value)} /></label>
          {error ? <div className={styles.inlineError}>{error}</div> : null}
          <div className={styles.actionRow}>
            <button className={styles.secondaryButton} disabled={busy} onClick={saveProfile}>Guardar perfil</button>
            <button className={styles.primaryButton} disabled={busy} onClick={assess}>Ejecutar assessment</button>
          </div>
        </section>

        <section className={styles.drawerSection}>
          <h3>Políticas aplicables</h3>
          <div className={styles.chipList}>{(profile.applicable_policies ?? []).length ? profile.applicable_policies?.map((item) => <span className={styles.chip} key={item}>{item}</span>) : <span>No evaluado</span>}</div>
        </section>

        <section className={styles.drawerSection}>
          <h3>Deployments vinculados</h3>
          {(agent.deployments ?? []).map((deployment) => <div className={styles.listRow} key={deployment.deployment_id}><div><strong>{deployment.display_name}</strong><small>{deployment.provider_deployment_id}</small></div><span>{deployment.binding_status}</span></div>)}
          {!agent.deployments?.length ? <p>No hay deployments vinculados.</p> : null}
        </section>

        <section className={styles.drawerSection}>
          <h3>Hallazgos</h3>
          {(agent.findings ?? []).map((finding) => <div className={styles.findingRow} key={finding.finding_id}><span className={styles.severity}>{finding.severity}</span><div><strong>{finding.title}</strong><small>{finding.policy_id ? `${finding.policy_id}@${finding.policy_version}` : "Control de gobierno"}</small></div></div>)}
          {!agent.findings?.length ? <p>Sin hallazgos persistidos.</p> : null}
        </section>
      </div>
    </aside>
  );
}

function DrawerHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return <header className={styles.drawerHeader}><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Cerrar detalle">×</button></header>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}
