"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./DemoControls.module.css";

type SyntheticDataResponse = {
  count?: number;
  total_backlog?: number;
  batch_id?: string;
  message?: string;
};

type GenerationState =
  | "idle"
  | "loading"
  | "success"
  | "error";

export default function DemoControls() {
  const pathname = usePathname();
  const [state, setState] =
    useState<GenerationState>("idle");
  const [count, setCount] = useState(25);
  const [message, setMessage] = useState(
    "Genera datos ficticios sin eliminar las demandas existentes."
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  async function generateSyntheticData() {
    const confirmed = window.confirm(
      `Se agregarán ${count} demandas sintéticas al backlog actual. ` +
      "Los registros existentes no serán eliminados. ¿Continuamos?"
    );

    if (!confirmed) return;

    try {
      setState("loading");
      setMessage(
        `Generando ${count} demandas sintéticas...`
      );

      const response = await fetch(
        "/api/synthetic-data/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            count,
            actor: "Synthetic Data Operator"
          })
        }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          `Synthetic data generation failed with HTTP ` +
          `${response.status}: ${text}`
        );
      }

      const payload =
        JSON.parse(text) as SyntheticDataResponse;

      const generated = payload.count ?? count;
      const total = payload.total_backlog;

      setState("success");
      setMessage(
        total
          ? `${generated} demandas sintéticas generadas. ` +
            `Backlog total: ${total}.`
          : `${generated} demandas sintéticas generadas.`
      );

      window.setTimeout(
        () => window.location.reload(),
        1000
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error desconocido al generar datos sintéticos.";

      setState("error");
      setMessage(errorMessage);
    }
  }

  if (pathname?.startsWith("/agent-governance")) return null;

  if (!panelOpen) {
    return (
      <button
        className={styles.launcher}
        type="button"
        onClick={() => setPanelOpen(true)}
        aria-expanded="false"
        aria-controls="atlas-synthetic-data-panel"
      >
        Datos sintéticos
      </button>
    );
  }

  return (
    <aside
      id="atlas-synthetic-data-panel"
      className={`${styles.panel} ${styles[state]}`}
      aria-label="Controles de datos sintéticos ATLAS DataGob"
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Entorno de prueba
          </span>
          <strong>Datos sintéticos</strong>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.toggle}
            type="button"
            onClick={() =>
              setGuideOpen((value) => !value)
            }
          >
            {guideOpen ? "Ocultar guía" : "Guía"}
          </button>

          <button
            className={styles.close}
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="Cerrar controles de datos sintéticos"
          >
            Cerrar
          </button>
        </div>
      </div>

      <p className={styles.message}>{message}</p>

      <div className={styles.generatorRow}>
        <label>
          Cantidad
          <select
            value={count}
            onChange={(event) =>
              setCount(Number(event.target.value))
            }
            disabled={state === "loading"}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primary}
          type="button"
          onClick={generateSyntheticData}
          disabled={state === "loading"}
        >
          {state === "loading"
            ? "Generando..."
            : "Generar datos sintéticos"}
        </button>

        <a
          className={styles.secondary}
          href="/api/demands/backlog"
          target="_blank"
          rel="noreferrer"
        >
          Ver backlog
        </a>
      </div>

      {guideOpen ? (
        <ol className={styles.guide}>
          <li>
            Selecciona cuántas demandas ficticias
            quieres generar.
          </li>
          <li>
            Los datos sintéticos se agregan al backlog;
            no eliminan demandas existentes.
          </li>
          <li>
            Cada registro queda identificado como
            sintético y asociado a un lote.
          </li>
          <li>
            Usa Comité Operativo y Tablero Ejecutivo
            para probar el flujo completo.
          </li>
        </ol>
      ) : null}
    </aside>
  );
}
