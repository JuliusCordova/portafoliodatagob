"use client";

import { useEffect, useState } from "react";
import styles from "./ExecutiveDemoRibbon.module.css";

type SessionPayload = {
  mode?: string;
  user?: string;
  roles?: string[];
  source?: string;
};

type RibbonState = "loading" | "ready" | "demo" | "error";

function displayRoles(roles?: string[]) {
  if (!roles || roles.length === 0) return "Sin rol propagado";
  return roles.map((role) => role.replaceAll("_", " ")).join(" · ");
}

export default function ExecutiveDemoRibbon() {
  const [state, setState] = useState<RibbonState>("loading");
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionPayload;
        if (!mounted) return;
        setSession(payload);
        setState(payload.mode && payload.mode !== "disabled" ? "ready" : "demo");
      } catch {
        if (!mounted) return;
        setState("error");
      }
    }
    void loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const readiness = state === "ready" ? "Piloto controlado" : state === "demo" ? "Demo local" : state === "error" ? "Revisar sesión" : "Cargando";

  return (
    <section className={`${styles.ribbon} ${styles[state]}`} aria-label="Resumen ejecutivo del piloto ATLAS DataGob">
      <div className={styles.content}>
        <div className={styles.story}>
          <span className={styles.eyebrow}>ATLAS DataGob · Executive pilot</span>
          <strong>De demanda dispersa a portafolio gobernado, priorizado y trazable.</strong>
          <p>Intake multiagente, validación de políticas, arquitectura, scoring financiero y evidencia operativa en una sola experiencia.</p>
        </div>
        <div className={styles.scorecard}>
          <div>
            <span>Readiness</span>
            <strong>{readiness}</strong>
          </div>
          <div>
            <span>Identidad</span>
            <strong>{session?.user ?? "demo.operator"}</strong>
          </div>
          <div>
            <span>Roles</span>
            <strong>{displayRoles(session?.roles)}</strong>
          </div>
        </div>
        <nav className={styles.actions} aria-label="Accesos rápidos de demo ejecutiva">
          <a href="/api/session" target="_blank" rel="noreferrer">Sesión</a>
          <a href="/api/demo/cases" target="_blank" rel="noreferrer">Seed</a>
        </nav>
      </div>
    </section>
  );
}
