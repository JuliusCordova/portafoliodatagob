"use client";

import { useState } from "react";
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
  const [state, setState] =
    useState<GenerationState>("idle");
  const [count, setCount] = useState(25);
  const [message, setMessage] = useState(
    "Genera datos ficticios sin eliminar las demandas existentes."
  );
  const [expanded, setExpanded] = useState(false);

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

  return (
    <aside
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

        <button
          className={styles.toggle}
          type="button"
          onClick={() =>
            setExpanded((value) => !value)
          }
        >
          {expanded ? "Ocultar" : "Guía"}
        </button>
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

      {expanded ? (
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
