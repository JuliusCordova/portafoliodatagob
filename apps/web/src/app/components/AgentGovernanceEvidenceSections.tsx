"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import styles from "./AgentGovernanceEvidenceSections.module.css";

type Artifact = {
  artifact_id: string;
  run_id: string;
  agent_id: string | null;
  artifact_type: string;
  name: string | null;
  uri: string | null;
  content_type: string | null;
  checksum: string | null;
  created_at: string;
};

type Alert = {
  alert_id: string;
  agent_system_id: string | null;
  agent_id: string | null;
  run_id: string | null;
  alert_type: string | null;
  severity: string;
  title: string;
  message: string | null;
  source: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
};

type Overview = {
  period_days: number;
  artifacts?: Artifact[];
  alerts?: Alert[];
};

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

function severityClass(severity: string): string {
  const normalized = severity.toUpperCase();
  if (["CRITICAL", "HIGH", "ERROR"].includes(normalized)) return styles.severityHigh;
  if (["WARNING", "WARN", "MEDIUM"].includes(normalized)) return styles.severityWarn;
  return styles.severityInfo;
}

export default function AgentGovernanceEvidenceSections() {
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [days, setDays] = useState("14");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname?.startsWith("/agent-governance")) {
      setTarget(null);
      return;
    }
    setTarget(document.getElementById("summary")?.parentElement ?? null);

    const select = document.querySelector('select[aria-label="Periodo"]') as HTMLSelectElement | null;
    if (!select) return;
    setDays(select.value || "14");
    const onChange = () => setDays(select.value || "14");
    select.addEventListener("change", onChange);
    return () => select.removeEventListener("change", onChange);
  }, [pathname]);

  useEffect(() => {
    if (!pathname?.startsWith("/agent-governance")) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/agent-governance/overview?days=${encodeURIComponent(days)}`, {
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(typeof payload?.detail === "string" ? payload.detail : `AgentOps API respondió ${response.status}`);
        }
        if (!cancelled) setOverview(payload as Overview);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo consultar evidencia AgentOps");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [days, pathname]);

  if (!pathname?.startsWith("/agent-governance") || !target) return null;

  const artifacts = overview?.artifacts ?? [];
  const alerts = overview?.alerts ?? [];

  return createPortal(
    <section className={styles.evidenceGrid} aria-label="Evidencia AgentOps adicional">
      <article id="artifacts" className={styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>EVIDENCIA DE SALIDA</span>
            <h2>Artefactos</h2>
            <p>Salidas persistidas asociadas a run_id observados en AgentOps.</p>
          </div>
          <span className={styles.realBadge}>BIGQUERY REAL</span>
        </header>

        {loading ? <div className={styles.state}>Consultando artefactos…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {!loading && !error && artifacts.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⌁</span>
            <div>
              <strong>Sin artefactos persistidos en los últimos {overview?.period_days ?? days} días</strong>
              <p>La sección ya está conectada a <code>agent_artifacts</code>. ATLAS no fabrica evidencia cuando la instrumentación todavía no ha emitido registros.</p>
            </div>
          </div>
        ) : null}

        {!loading && !error && artifacts.length > 0 ? (
          <div className={styles.list}>
            {artifacts.slice(0, 12).map((artifact) => (
              <div className={styles.row} key={artifact.artifact_id}>
                <div className={styles.rowMain}>
                  <strong>{artifact.name || artifact.artifact_type}</strong>
                  <span>{artifact.artifact_type} · {artifact.agent_id || "agente no informado"}</span>
                  <small>{artifact.run_id} · {formatTimestamp(artifact.created_at)}</small>
                </div>
                <div className={styles.rowMeta}>
                  <span>{artifact.content_type || "tipo no informado"}</span>
                  {artifact.uri ? <code title={artifact.uri}>{artifact.uri}</code> : <em>URI no registrada</em>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article id="alerts" className={styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>SEÑALES OPERATIVAS</span>
            <h2>Alertas</h2>
            <p>Alertas persistidas del sistema o de runs observados.</p>
          </div>
          <span className={styles.realBadge}>BIGQUERY REAL</span>
        </header>

        {loading ? <div className={styles.state}>Consultando alertas…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {!loading && !error && alerts.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◎</span>
            <div>
              <strong>Sin alertas persistidas en los últimos {overview?.period_days ?? days} días</strong>
              <p>La sección ya está conectada a <code>agent_alerts</code>. Un estado vacío significa que no existe evidencia de alerta persistida para este periodo.</p>
            </div>
          </div>
        ) : null}

        {!loading && !error && alerts.length > 0 ? (
          <div className={styles.list}>
            {alerts.slice(0, 12).map((alert) => (
              <div className={styles.row} key={alert.alert_id}>
                <div className={styles.rowMain}>
                  <div className={styles.alertTitle}>
                    <span className={`${styles.severity} ${severityClass(alert.severity)}`}>{alert.severity}</span>
                    <strong>{alert.title}</strong>
                  </div>
                  <span>{alert.agent_id || "ATLAS-DATAGOB"} · {alert.alert_type || alert.source}</span>
                  <small>{alert.run_id || "sin run_id"} · {formatTimestamp(alert.created_at)}</small>
                  {alert.message ? <p className={styles.message}>{alert.message}</p> : null}
                </div>
                <span className={alert.acknowledged ? styles.ack : styles.open}>{alert.acknowledged ? "Reconocida" : "Abierta"}</span>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </section>,
    target
  );
}
