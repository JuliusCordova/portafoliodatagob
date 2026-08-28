import styles from "./AgentGovernance.module.css";

const navigation = [
  ["◫", "Resumen ejecutivo", true],
  ["◎", "FinOps IA", false],
  ["✓", "Calidad & Evaluación", false],
  ["◇", "Agentes", false],
  ["↻", "Ejecuciones", false],
  ["✓", "Calidad & Salud", false],
  ["⌁", "Artefactos", false],
  ["◎", "Alertas", false],
  ["⌘", "Gobierno", false]
] as const;

const kpis = [
  { icon: "◎", label: "Runs agénticos", value: "—", note: "Esperando telemetría real", tone: "coral" },
  { icon: "◇", label: "Agentes activos", value: "5", note: "ATLAS DataGob · contrato V1", tone: "blue" },
  { icon: "✓", label: "Tasa de éxito", value: "—", note: "Se calculará desde AgentOps", tone: "green" },
  { icon: "◴", label: "Duración p90", value: "—", note: "Sin histórico persistido aún", tone: "rose" },
  { icon: "▣", label: "Artefactos", value: "—", note: "DOCX y evidencia gobernada", tone: "cyan" },
  { icon: "!", label: "Alertas sin leer", value: "—", note: "Sin fuente conectada aún", tone: "amber" }
] as const;

const agents = [
  ["Intake Orchestrator", "atlas_intake_orchestrator", "Orquestación conversacional"],
  ["Business Fact Extractor", "atlas_business_fact_extractor", "Extracción semántica"],
  ["Data Readiness", "atlas_data_readiness_agent", "Especialista ADK"],
  ["Architecture Validation", "atlas_architecture_validation_agent", "Especialista ADK"],
  ["Policy & Controls", "atlas_policy_controls_agent", "Especialista ADK"]
] as const;

export default function AgentGovernancePage() {
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
          {navigation.map(([icon, label, active]) => (
            <button key={label} className={active ? styles.navActive : styles.navItem} type="button">
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span>AMBIENTE</span>
          <strong><i /> Preview de diseño F59</strong>
          <small>Fuente: contrato AgentOps V1</small>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>GEMINI ADK + AGENTOPS · GOBIERNO REUTILIZABLE</p>
            <h1>Gobierno & AgentOps — ATLAS DataGob</h1>
            <p className={styles.subtitle}>Observabilidad, trazabilidad, FinOps y gobierno de agentes sobre un contrato común.</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.previewPill}><i /> Preview de diseño</span>
            <select aria-label="Periodo" defaultValue="14">
              <option value="7">Últimos 7 días</option>
              <option value="14">Últimos 14 días</option>
              <option value="30">Últimos 30 días</option>
            </select>
            <button type="button">Actualizar tablero</button>
          </div>
        </header>

        <section className={styles.kpiGrid} aria-label="Indicadores ejecutivos">
          {kpis.map((item) => (
            <article key={item.label} className={`${styles.kpiCard} ${styles[item.tone]}`}>
              <div className={styles.kpiIcon}>{item.icon}</div>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.dashboardGrid}>
          <article className={`${styles.panel} ${styles.trendPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2>Tendencia de ejecuciones</h2>
                <p>El gráfico se activará al persistir `agent_runs` en BigQuery.</p>
              </div>
              <span className={styles.sourceBadge}>CONTRATO V1</span>
            </div>
            <div className={styles.emptyTrend}>
              <div className={styles.axisY}><span>runs</span></div>
              <div className={styles.gridLines}><i /><i /><i /><i /></div>
              <div className={styles.noData}>
                <strong>Sin histórico conectado</strong>
                <span>F59 no fabrica métricas. Aquí aparecerán los runs reales de ATLAS.</span>
              </div>
            </div>
          </article>

          <article className={`${styles.panel} ${styles.agentsPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2>Agentes registrados</h2>
                <p>Primer sistema consumidor: ATLAS-DATAGOB</p>
              </div>
              <span className={styles.softBadge}>5 agentes</span>
            </div>
            <div className={styles.agentList}>
              {agents.map(([name, id, role]) => (
                <div className={styles.agentRow} key={id}>
                  <div>
                    <strong>{name}</strong>
                    <span>{id}</span>
                    <small>{role}</small>
                  </div>
                  <i />
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.rightStack}>
            <article className={styles.panel}>
              <div className={styles.panelHeadCompact}>
                <h2>Estado de ejecuciones</h2>
              </div>
              <div className={styles.donutLayout}>
                <div className={styles.donut}><div><strong>—</strong><span>runs</span></div></div>
                <div className={styles.legend}>
                  <span><i className={styles.legendOk} /> Completadas —</span>
                  <span><i className={styles.legendFail} /> Fallidas —</span>
                  <span><i className={styles.legendRun} /> En curso —</span>
                </div>
              </div>
            </article>

            <article className={`${styles.panel} ${styles.miniPanel}`}>
              <div className={styles.miniHead}><strong>FinOps IA</strong><span>Ver detalle →</span></div>
              <div className={styles.miniGrid}>
                <div><span>Tokens</span><strong>—</strong></div>
                <div><span>Runs</span><strong>—</strong></div>
                <div><span>Costo</span><strong>No disponible</strong></div>
              </div>
              <small>Facturado, atribuido y no atribuible se mostrarán por separado.</small>
            </article>

            <article className={`${styles.panel} ${styles.miniPanel}`}>
              <div className={styles.miniHead}><strong>Calidad & Evaluación</strong><span>Ver detalle →</span></div>
              <div className={styles.healthLine}><i /> Perfil `agent_evaluation` preparado</div>
            </article>
          </aside>
        </section>

        <footer className={styles.note}>
          <span>ⓘ</span>
          <p><strong>F59 · Primer incremento:</strong> esta vista replica el lenguaje visual de Business Rules como golden reference, pero solo muestra datos reales cuando exista una fuente persistida. Los guiones representan capacidades aún no conectadas.</p>
        </footer>
      </section>
    </main>
  );
}
