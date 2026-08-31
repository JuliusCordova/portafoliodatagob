"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./AgentGovernanceEnhancer.module.css";

type KpiKey = "runs" | "calls" | "agents" | "success" | "latency" | "tokens";

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
  summary: {
    observed_runs: number;
    llm_calls: number;
    observed_agents: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    success_rate: number | null;
    avg_latency_ms: number | null;
    p90_latency_ms: number | null;
  };
  agents: AgentMetric[];
  runs: RunMetric[];
};

const keys: KpiKey[] = ["runs", "calls", "agents", "success", "latency", "tokens"];

const labels: Record<KpiKey, { title: string; description: string }> = {
  runs: {
    title: "Ejecuciones observadas",
    description: "Detalle de los run_id detectados en telemetría LLM para el periodo seleccionado."
  },
  calls: {
    title: "Llamadas LLM por agente",
    description: "Distribución de llamadas Gemini ADK capturadas por agente."
  },
  agents: {
    title: "Detalle de agentes",
    description: "Consumo, ejecuciones, éxito y latencia de los agentes observados."
  },
  success: {
    title: "Tasa de éxito por agente",
    description: "Comparación del porcentaje de llamadas LLM exitosas por agente."
  },
  latency: {
    title: "Latencia p90 por agente",
    description: "Ranking de latencia p90 para identificar agentes y llamadas que requieren análisis."
  },
  tokens: {
    title: "Consumo de tokens",
    description: "Distribución de tokens por agente con separación de entrada y salida a nivel agregado."
  }
};

const agentNames: Record<string, string> = {
  atlas_intake_orchestrator: "Intake Orchestrator",
  atlas_business_fact_extractor: "Business Fact Extractor",
  atlas_data_readiness_agent: "Data Readiness",
  atlas_architecture_validation_agent: "Architecture Validation",
  atlas_policy_controls_agent: "Policy & Controls"
};

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

function width(value: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.max(4, Math.min(100, (value / max) * 100))}%`;
}

export default function AgentGovernanceEnhancer() {
  const pathname = usePathname();
  const [selected, setSelected] = useState<KpiKey | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async (key: KpiKey) => {
    setSelected(key);
    setLoading(true);
    setError(null);
    try {
      const periodSelect = document.querySelector('select[aria-label="Periodo"]') as HTMLSelectElement | null;
      const days = periodSelect?.value || "14";
      const response = await fetch(`/api/agent-governance/overview?days=${encodeURIComponent(days)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.detail === "string" ? payload.detail : `AgentOps API respondió ${response.status}`);
      }
      setOverview(payload as Overview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle AgentOps");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/agent-governance")) return;

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('section[aria-label="Indicadores ejecutivos"] > article')
    );

    const cleanups = cards.slice(0, keys.length).map((card, index) => {
      const key = keys[index];
      card.classList.add(styles.interactiveCard);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Ver detalle de ${labels[key].title}`);
      card.setAttribute("aria-controls", "atlas-kpi-drilldown");

      const onClick = () => void loadDetail(key);
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void loadDetail(key);
        }
      };

      card.addEventListener("click", onClick);
      card.addEventListener("keydown", onKeyDown);
      return () => {
        card.classList.remove(styles.interactiveCard);
        card.removeAttribute("role");
        card.removeAttribute("tabindex");
        card.removeAttribute("aria-label");
        card.removeAttribute("aria-controls");
        card.removeEventListener("click", onClick);
        card.removeEventListener("keydown", onKeyDown);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [loadDetail, pathname]);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  const sortedAgents = useMemo(() => overview?.agents ?? [], [overview]);

  if (!pathname?.startsWith("/agent-governance") || !selected) return null;

  const meta = labels[selected];
  const maxCalls = Math.max(0, ...sortedAgents.map((agent) => agent.llm_calls));
  const maxLatency = Math.max(0, ...sortedAgents.map((agent) => agent.p90_latency_ms ?? 0));
  const maxTokens = Math.max(0, ...sortedAgents.map((agent) => agent.total_tokens));

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={() => setSelected(null)}>
      <aside
        id="atlas-kpi-drilldown"
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.drawerHeader}>
          <div>
            <span className={styles.eyebrow}>ATLAS AGENTOPS · DRILL-DOWN</span>
            <h2>{meta.title}</h2>
            <p>{meta.description}</p>
          </div>
          <button className={styles.closeButton} type="button" onClick={() => setSelected(null)} aria-label="Cerrar detalle">×</button>
        </header>

        <div className={styles.drawerBody}>
          {overview ? (
            <div className={styles.sourceRow}>
              <span className={styles.badge}>BIGQUERY REAL</span>
              <span className={styles.periodBadge}>Últimos {overview.period_days} días</span>
            </div>
          ) : null}

          {loading ? <div className={styles.loading}>Consultando detalle AgentOps…</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}

          {!loading && !error && overview ? (
            <>
              {selected === "runs" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}><strong>Runs recientes</strong><span>{formatNumber(overview.summary.observed_runs)} observados</span></div>
                  <div className={styles.list}>
                    {overview.runs.map((run) => (
                      <div className={styles.detailRow} key={run.run_id}>
                        <div className={styles.rowTop}><strong>{run.run_id}</strong><em>{run.status}</em></div>
                        <div className={styles.detailMeta}>
                          <span>{formatNumber(run.llm_calls)} llamadas</span>
                          <span>{formatNumber(run.observed_agents)} agentes</span>
                          <span>{formatNumber(run.total_tokens)} tokens</span>
                          <span>p90 {formatLatency(run.p90_latency_ms)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selected === "calls" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}><strong>Distribución por agente</strong><span>{formatNumber(overview.summary.llm_calls)} llamadas</span></div>
                  <div className={styles.list}>
                    {[...sortedAgents].sort((a, b) => b.llm_calls - a.llm_calls).map((agent) => (
                      <div className={styles.detailRow} key={agent.agent_id}>
                        <div className={styles.rowTop}><strong>{agentNames[agent.agent_id] ?? agent.agent_id}</strong><em>{formatNumber(agent.llm_calls)}</em></div>
                        <div className={styles.meterTrack}><div className={styles.meterFillViolet} style={{ width: width(agent.llm_calls, maxCalls) }} /></div>
                        <div className={styles.detailMeta}><span>{formatNumber(agent.observed_runs)} runs</span><span>{agent.model_name}</span></div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selected === "agents" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}><strong>Agentes instrumentados</strong><span>{formatNumber(overview.summary.observed_agents)} activos en evidencia</span></div>
                  <div className={styles.list}>
                    {sortedAgents.map((agent) => (
                      <div className={styles.detailRow} key={agent.agent_id}>
                        <div className={styles.rowTop}><strong>{agentNames[agent.agent_id] ?? agent.agent_id}</strong><em>{formatPercent(agent.success_rate)}</em></div>
                        <div className={styles.detailMeta}>
                          <span>{formatNumber(agent.llm_calls)} calls</span>
                          <span>{formatNumber(agent.observed_runs)} runs</span>
                          <span>{formatNumber(agent.total_tokens)} tokens</span>
                          <span>p90 {formatLatency(agent.p90_latency_ms)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selected === "success" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}><strong>Éxito por agente</strong><span>Global {formatPercent(overview.summary.success_rate)}</span></div>
                  <div className={styles.list}>
                    {[...sortedAgents].sort((a, b) => (b.success_rate ?? 0) - (a.success_rate ?? 0)).map((agent) => (
                      <div className={styles.detailRow} key={agent.agent_id}>
                        <div className={styles.rowTop}><strong>{agentNames[agent.agent_id] ?? agent.agent_id}</strong><em>{formatPercent(agent.success_rate)}</em></div>
                        <div className={styles.meterTrack}><div className={styles.meterFillGreen} style={{ width: `${Math.max(3, agent.success_rate ?? 0)}%` }} /></div>
                        <div className={styles.detailMeta}><span>{formatNumber(agent.llm_calls)} llamadas evaluadas</span></div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selected === "latency" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}><strong>Ranking de latencia p90</strong><span>Global {formatLatency(overview.summary.p90_latency_ms)}</span></div>
                  <div className={styles.list}>
                    {[...sortedAgents].sort((a, b) => (b.p90_latency_ms ?? 0) - (a.p90_latency_ms ?? 0)).map((agent) => (
                      <div className={styles.detailRow} key={agent.agent_id}>
                        <div className={styles.rowTop}><strong>{agentNames[agent.agent_id] ?? agent.agent_id}</strong><em>{formatLatency(agent.p90_latency_ms)}</em></div>
                        <div className={styles.meterTrack}><div className={styles.meterFill} style={{ width: width(agent.p90_latency_ms ?? 0, maxLatency) }} /></div>
                        <div className={styles.detailMeta}><span>Promedio {formatLatency(agent.avg_latency_ms)}</span><span>{formatNumber(agent.llm_calls)} calls</span></div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selected === "tokens" ? (
                <>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}><span>Input tokens</span><strong>{formatNumber(overview.summary.input_tokens)}</strong></div>
                    <div className={styles.summaryCard}><span>Output tokens</span><strong>{formatNumber(overview.summary.output_tokens)}</strong></div>
                    <div className={styles.summaryCard}><span>Total reportado</span><strong>{formatNumber(overview.summary.total_tokens)}</strong></div>
                  </div>
                  <section className={styles.section}>
                    <div className={styles.sectionHead}><strong>Consumo por agente</strong><span>Sin costo monetario inferido</span></div>
                    <div className={styles.list}>
                      {[...sortedAgents].sort((a, b) => b.total_tokens - a.total_tokens).map((agent) => (
                        <div className={styles.detailRow} key={agent.agent_id}>
                          <div className={styles.rowTop}><strong>{agentNames[agent.agent_id] ?? agent.agent_id}</strong><em>{formatNumber(agent.total_tokens)}</em></div>
                          <div className={styles.meterTrack}><div className={styles.meterFillViolet} style={{ width: width(agent.total_tokens, maxTokens) }} /></div>
                          <div className={styles.detailMeta}><span>{formatNumber(agent.input_tokens)} input</span><span>{formatNumber(agent.output_tokens)} output</span></div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
            </>
          ) : null}

          {!loading && !error && overview && overview.agents.length === 0 && overview.runs.length === 0 ? (
            <div className={styles.empty}>No existe evidencia persistida para este periodo.</div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
