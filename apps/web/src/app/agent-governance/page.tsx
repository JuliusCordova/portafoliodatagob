"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgentDrawer,
  DeploymentDrawer,
  type Deployment,
  type GovernedAgent
} from "./AgentGovernanceDrawers";
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

  const loadAgent = useCallback(async (agentId: string) => {
    const payload = await api<{ agent: GovernedAgent }>(`agents/${encodeURIComponent(agentId)}`);
    setAgentDetail(payload.agent);
  }, []);

  useEffect(() => {
    let mounted = true;
    void load()
      .catch((reason) => mounted && setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [load]);

  useEffect(() => {
    if (drawer?.kind !== "agent") {
      setAgentDetail(null);
      return;
    }
    void loadAgent(drawer.agentId).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [drawer, loadAgent]);

  const visibleDeployments = useMemo(
    () => deploymentFilter === "unbound"
      ? deployments.filter((item) => item.binding_status !== "bound")
      : deployments,
    [deployments, deploymentFilter]
  );

  async function refreshDiscovery() {
    setRefreshing(true);
    setError(null);
    setMessage("Consultando Agent Platform en modo read-only...");
    try {
      const result = await api<{ total_google_adk: number; inserted: number; updated: number }>("discovery/refresh", { method: "POST" });
      await load();
      setMessage(`Discovery PASS · ${result.total_google_adk} ADK · ${result.inserted} nuevos · ${result.updated} actualizados`);
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
          <button className={tab === "agents" ? styles.activeTab : ""} onClick={() => setTab("agents")}>Agentes</button>
          <button className={tab === "deployments" ? styles.activeTab : ""} onClick={() => setTab("deployments")}>Deployments</button>
        </div>
        <div className={styles.contextLine}>
          <strong>{tab === "agents" ? "Identidades lógicas gobernadas" : "Recursos ADK observados"}</strong>
          <span>{tab === "agents" ? "Riesgo, ownership, autonomía, políticas y evidencia pertenecen a esta identidad." : "Un deployment no se convierte automáticamente en un agente lógico."}</span>
        </div>
      </section>

      {loading ? <div className={styles.emptyState}>Cargando...</div> : null}

      {!loading && tab === "deployments" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><h2>Deployments ADK</h2><p>Fuente read-only: Google Agent Platform / Reasoning Engines.</p></div>
            <label className={styles.filterLabel}>Vista
              <select value={deploymentFilter} onChange={(event) => setDeploymentFilter(event.target.value as "all" | "unbound")}>
                <option value="all">Todos</option><option value="unbound">Sin asociar</option>
              </select>
            </label>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Deployment</th><th>Framework</th><th>Service Account</th><th>Source</th><th>Binding</th><th>Última observación</th></tr></thead>
              <tbody>{visibleDeployments.map((item) => (
                <tr key={item.deployment_id} onClick={() => setDrawer({ kind: "deployment", deployment: item })}>
                  <td><strong>{item.display_name}</strong><small>{item.provider_deployment_id}</small></td>
                  <td><span className={styles.chip}>Google ADK</span></td>
                  <td>{item.service_account ?? "No disponible"}</td>
                  <td>{item.deployment_source_kind ?? "No disponible"}</td>
                  <td><span className={`${styles.statusChip} ${item.binding_status === "bound" ? styles.good : styles.warn}`}>{statusLabel(item.binding_status)}</span></td>
                  <td>{humanDate(item.last_seen_at)}</td>
                </tr>
              ))}</tbody>
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
              <tbody>{agents.map((agent) => {
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
              })}</tbody>
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
      {drawer?.kind === "agent" && agentDetail ? (
        <AgentDrawer
          agent={agentDetail}
          onClose={() => setDrawer(null)}
          onChanged={async () => {
            await load();
            await loadAgent(drawer.agentId);
          }}
        />
      ) : null}
    </main>
  );
}
