"use client";

import { useState } from "react";
import styles from "./DemoControls.module.css";

type DemoResetResponse = {
  count?: number;
  demands?: unknown[];
  message?: string;
};

type ResetState = "idle" | "loading" | "success" | "error";

export default function DemoControls() {
  const [state, setState] = useState<ResetState>("idle");
  const [message, setMessage] = useState("Data sintética lista para cargar al modelo runtime.");
  const [expanded, setExpanded] = useState(false);

  async function resetDemoData() {
    const confirmed = window.confirm(
      "Esto reemplazará el backlog runtime local con las 10 demandas sintéticas semilla. ¿Continuamos?"
    );
    if (!confirmed) return;

    try {
      setState("loading");
      setMessage("Materializando data sintética en data/runtime/demand_backlog.json...");
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "Demo Operator" })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Demo reset failed with HTTP ${response.status}: ${text}`);
      const payload = JSON.parse(text) as DemoResetResponse;
      const count = payload.count ?? payload.demands?.length ?? 10;
      setState("success");
      setMessage(`${count} demandas sintéticas materializadas en el modelo runtime.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al resetear demo.";
      setState("error");
      setMessage(errorMessage);
    }
  }

  return (
    <aside className={`${styles.panel} ${styles[state]}`} aria-label="Controles de demo ATLAS DataGob">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Demo readiness</span>
          <strong>Data sintética</strong>
        </div>
        <button className={styles.toggle} type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Ocultar" : "Guía"}
        </button>
      </div>

      <p className={styles.message}>{message}</p>

      <div className={styles.actions}>
        <button className={styles.primary} type="button" onClick={resetDemoData} disabled={state === "loading"}>
          {state === "loading" ? "Cargando..." : "Resetear demo"}
        </button>
        <a className={styles.secondary} href="/api/demo/cases" target="_blank" rel="noreferrer">
          Ver seed
        </a>
      </div>

      {expanded ? (
        <ol className={styles.guide}>
          <li>Resetear demo para cargar 10 demandas sintéticas al backlog runtime.</li>
          <li>Ir a Comité Operativo y revisar la grilla por área, dominio, estado o prioridad.</li>
          <li>Editar una demanda, completar checklist del comité y recalcular score.</li>
          <li>Ir al Tablero Ejecutivo para mostrar prioridad, score, VAN y trazabilidad.</li>
        </ol>
      ) : null}
    </aside>
  );
}
