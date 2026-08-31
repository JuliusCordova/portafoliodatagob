"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./AgentGovernance.module.css";

type Summary = {
  observed_runs: number;
  llm_calls: number;
  observed_agents: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
  p90_latency_ms: number | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
};

type AgentMetric = {
  agent_id: string;
  model_name: string;
  llm_calls: number;
  observed_runs: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
  p90_latency_ms: number | null;
  last_observed_at: string | null;
};

type RunMetric = {
  run_id: string;
  trace_id: string | null;
  requested_by: string | null;
  started_at: string;
  finished_at: string;
  llm_calls: number;
  observed_agents: number;
  agent_ids: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  avg_latency_ms: number | null;
  p90_latency_ms: number | null;
  success_rate: number | null;
  status: string;
};

type Overview = {
  agent_system_id: string;
  period_days: number;
  source: {
    plane: string;
    table: string;
    run_semantics: string;
    run_lifecycle_instrumented: boolean;
    cost_semantics: string;
  };
  summary: Summary;
  agents: AgentMetric[];
  runs: RunMetric[];
};

const agentNames: Record<string, string> = {
  atlas_intake_orchestrator: "Intake Orchestrator",
  atlas_business_fact_extractor: "Business Fact Extractor",
  atlas_data_readiness_agent: "Data Readiness",
  atlas_architecture_validation_agent: "Architecture Validation",
  atlas_policy_controls_agent: "Policy & Controls"
};

const navigation = [
  ["◫", "Resumen ejecutivo", "#summary", true],
  ["◇", "Agentes", "#agents", false],
  ["↻", "Ejecuciones", "#runs", false],
  ["◎", "FinOps IA", "#finops", false],
  ["✓", "Calidad & Evaluación", "#quality", false],
  ["✓", "Calidad & Salud", "#health", false],
  ["⌁", "Artefactos", "#artifacts", false],
  ["◎", "Alertas", "#alerts", false],
  ["⌘", "Gobierno", "#governance", false]
] as const;

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatLatency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

const emptyOverview: Overview = {
  agent_system_id: "ATLAS-DATAGOB",
  period_days: 14,
  source: {
    plane: "bigquery_observability",
    table: "—",
    run_semantics: "distinct_run_id_observed_in_agent_llm_usage",
    run_lifecycle_instrumented: false,
    cost_semantics: "not_available_in_this_increment"
  },
  summary: {
    observed_runs: 0,
    llm_calls: 0,
    observed_agents: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    success_rate: null,
    avg_latency_ms: null,
    p90_latency_ms: null,
    first_observed_at: null,
    last_observed_at: null
  },
  agents: [],
  runs: []
};

export default function AgentGovernancePage() {
  const [days, setDays] = useState("14");
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent-governance/overview?days=${encodeURIComponent(days)}`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) {
        const detail = typeof payload?.detail === "string" ? payload.detail : payload?.message;
        throw new Error(detail || `AgentOps API respondió ${response.status}`);
      }
      setOverview(payload as Overview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar AgentOps");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const summary = overview.summary;
  const successRate = summary.success_rate ?? 0;
  const failedRate = Math.max(100 - successRate, 0);
  const kpis: Array<{
    icon: string;
    label: string;
    value: string;
    note: string;
    tone: "coral" | "blue" | "green" | "rose" | "cyan" | "amber";
  }> = [
    {
      icon: "◎",
      label: "Runs observados",
      value: formatNumber(summary.observed_runs),
      note: "run_id distintos con evidencia LLM",
      tone: "coral"
    },
    {
      icon: "↻",
      label: "Llamadas LLM",
      value: formatNumber(summary.llm_calls),
      note: `Últimos ${overview.period_days} días`,
      tone: "blue"
    },
    {
      icon: "◇",
      label: "Agentes observados",
      value: formatNumber(summary.observed_agents),
      note: overview.agent_system_id,
      tone: "green"
    },
    {
      icon: "✓",
      label: "Tasa de éxito",
      value: formatPercent(summary.success_rate),
      note: "Sobre llamadas LLM persistidas",
      tone: "rose"
    },
    {
      icon: "◴",
      label: "Latencia p90",
      value: formatLatency(summary.p90_latency_ms),
      note: `Promedio ${formatLatency(summary.avg_latency_ms)}`,
      tone: "cyan"
    },
    {
      icon: "▣",
      label: "Tokens totales",
      value: formatNumber(summary.total_tokens),
      note: `${formatNumber(summary.input_tokens)} entrada · ${formatNumber(summary.output_tokens)} salida`,
      tone: "amber"
    }
  ];

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>AT</div>
          <div>
            <strong>ATLAS</strong>
            <span>DataGob</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Agent Governance">
          {navigation.map(([icon, label, href, active]) => (
            <a key={label} href={href} className={active ? styles.navActive : styles.navItem}>
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span>AMBIENTE</span>
          <strong><i /> AgentOps F59 Preview</strong>
          <small>Fuente persistida: BigQuery</small>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header} id="summary">
          <div>
            <p className={styles.eyebrow}>GEMINI ADK + AGENTOPS · EVIDENCIA REAL</p>
            <h1>Gobierno & AgentOps — ATLAS DataGob</h1>
            <p className={styles.subtitle}>Observabilidad real por agente, ejecución, tokens, latencia y estado sobre el contrato reusable de SPEC-059.</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.previewPill}><i /> {loading ? "Actualizando" : "BigQuery conectado"}</span>
            <select aria-label="Periodo" value={days} onChange={(event) => setDays(event.target.value)}>
              <option value="7">Últimos 7 días</option>
              <option value="14">Últimos 14 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
            <button type="button" onClick={() => void loadOverview()} disabled={loading}>
              {loading ? "Consultando…" : "Actualizar tablero"}
            </button>
          </div>
        </header>

        {error ? (
          <section className={styles.note} role="alert">
            <span>!</span>
            <p><strong>AgentOps no disponible:</strong> {error}</p>
          </section>
        ) : null}

        <section className={styles.kpiGrid} aria-label="Indicadores ejecutivos">
          {kpis.map((item) => (
            <article key={item.label} className={`${styles.kpiCard} ${styles[item.tone]}`}>
              <div className={styles.kpiIcon}>{item.icon}</div>
              <div>
                <span>{item.label}</span>
                <strong>{loading ? "…" : item.value}</strong>
                <small>{item.note}</small>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.dashboardGrid}>
          <article className={`${styles.panel} ${styles.trendPanel}`} id="runs">
            <div className={styles.panelHead}>
              <div>
                <h2>Ejecuciones observadas</h2>
                <p>Drill-down de los últimos run_id detectados en telemetría LLM.</p>
              </div>
              <span className={styles.sourceBadge}>BIGQUERY REAL</span>
            </div>

            <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
              {overview.runs.length === 0 && !loading ? (
                <div className={styles.noData} style={{ position: "static", padding: 48 }}>
                  <strong>Sin ejecuciones en el periodo</strong>
                  <span>No se fabrican runs cuando no existe evidencia persistida.</span>
                </div>
              ) : null}
              {overview.runs.slice(0, 8).map((run) => (
                <div
                  key={run.run_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(210px, 1.2fr) repeat(4, minmax(72px, .55fr))",
                    gap: 10,
                    alignItems: "center",
                    border: "1px solid #eef1f6",
                    borderRadius: 12,
                    padding: "11px 12px",
                    background: "#fff"
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 11 }}>{run.run_id}</strong>
                    <span style={{ display: "block", fontSize: 9, color: "#8993a7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {run.agent_ids.replaceAll(",", " · ")}
                    </span>
                    <small style={{ color: "#a1a9b8", fontSize: 8 }}>{formatTimestamp(run.finished_at)}</small>
                  </div>
                  <div style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 8, color: "#9aa3b4" }}>LLM calls</span><strong style={{ fontSize: 12 }}>{formatNumber(run.llm_calls)}</strong></div>
                  <div style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 8, color: "#9aa3b4" }}>Agentes</span><strong style={{ fontSize: 12 }}>{formatNumber(run.observed_agents)}</strong></div>
                  <div style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 8, color: "#9aa3b4" }}>Tokens</span><strong style={{ fontSize: 12 }}>{formatNumber(run.total_tokens)}</strong></div>
                  <div style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 8, color: "#9aa3b4" }}>Estado</span><strong style={{ fontSize: 10, color: run.status === "SUCCESS" ? "#15925d" : "#e74a51" }}>{run.status}</strong></div>
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.agentsPanel}`} id="agents">
            <div className={styles.panelHead}>
              <div>
                <h2>Agentes observados</h2>
                <p>Consumo y desempeño medidos desde callbacks Gemini ADK.</p>
              </div>
              <span className={styles.softBadge}>{formatNumber(summary.observed_agents)} agentes</span>
            </div>
            <div className={styles.agentList}>
              {overview.agents.map((agent) => (
                <div className={styles.agentRow} key={agent.agent_id}>
                  <div>
                    <strong>{agentNames[agent.agent_id] ?? agent.agent_id}</strong>
                    <span>{agent.agent_id}</span>
                    <small>{formatNumber(agent.llm_calls)} calls · {formatNumber(agent.total_tokens)} tokens · p90 {formatLatency(agent.p90_latency_ms)}</small>
                  </div>
                  <i title={`${formatPercent(agent.success_rate)} success`} />
                </div>
              ))}
              {overview.agents.length === 0 && !loading ? (
                <div className={styles.agentRow}><div><strong>Sin agentes observados</strong><small>No existe telemetría para el periodo seleccionado.</small></div></div>
              ) : null}
            </div>
          </article>

          <aside className={styles.rightStack}>
            <article className={styles.panel}>
              <div className={styles.panelHeadCompact}>
                <h2>Estado de llamadas LLM</h2>
              </div>
              <div className={styles.donutLayout}>
                <div
                  className={styles.donut}
                  style={{ background: `conic-gradient(#1bae78 0 ${successRate}%, #e74a51 ${successRate}% 100%)` }}
                >
                  <div><strong>{formatPercent(summary.success_rate)}</strong><span>success</span></div>
                </div>
                <div className={styles.legend}>
                  <span><i className={styles.legendOk} /> Éxito {formatPercent(summary.success_rate)}</span>
                  <span><i className={styles.legendFail} /> No éxito {formatPercent(failedRate)}</span>
                  <span><i className={styles.legendRun} /> {formatNumber(summary.llm_calls)} llamadas</span>
                </div>
              </div>
            </article>

            <article className={`${styles.panel} ${styles.miniPanel}`} id="finops">
              <div className={styles.miniHead}><strong>FinOps IA · consumo</strong><span>V1 observado</span></div>
              <div className={styles.miniGrid}>
                <div><span>Input tokens</span><strong>{formatNumber(summary.input_tokens)}</strong></div>
                <div><span>Output tokens</span><strong>{formatNumber(summary.output_tokens)}</strong></div>
                <div><span>Costo</span><strong>No disponible</strong></div>
              </div>
              <small>El costo no se estima como real hasta conectar Billing Export y reglas de atribución.</small>
            </article>

            <article className={`${styles.panel} ${styles.miniPanel}`} id="quality">
              <div className={styles.miniHead}><strong>Calidad & Evaluación</strong><span>Próximo incremento</span></div>
              <div className={styles.healthLine}><i /> Telemetría LLM persistida y correlacionada</div>
              <small>Última observación: {formatTimestamp(summary.last_observed_at)}</small>
            </article>
          </aside>
        </section>

        <footer className={styles.note}>
          <span>ⓘ</span>
          <p>
            <strong>Semántica F59:</strong> los runs mostrados son `run_id` distintos observados en `agent_llm_usage`. El lifecycle completo de `agent_runs` todavía no está instrumentado. FinOps monetario, artefactos, alertas y evaluaciones permanecen como no disponibles hasta conectar sus fuentes reales.
          </p>
        </footer>
      </section>
    </main>
  );
}
