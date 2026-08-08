"use client";

import { useEffect, useState } from "react";
import styles from "./SessionBanner.module.css";

type WebSession = {
  mode: string;
  user: string;
  roles: string[];
  authenticated: boolean;
  source: string;
};

type SessionResponse = {
  session: WebSession;
};

const DEFAULT_SESSION: WebSession = {
  mode: "disabled",
  user: "system:web-identity-disabled",
  roles: ["platform_admin"],
  authenticated: false,
  source: "disabled"
};

export default function SessionBanner() {
  const [session, setSession] = useState<WebSession>(DEFAULT_SESSION);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!response.ok) throw new Error(`Session endpoint failed with HTTP ${response.status}`);
        const payload = (await response.json()) as SessionResponse;
        if (active) {
          setSession(payload.session);
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("error");
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  const modeLabel = session.mode === "disabled" ? "Demo local" : session.mode === "static" ? "Piloto estático" : "Identidad propagada";
  const rolesLabel = session.roles.length > 0 ? session.roles.join(" · ") : "sin rol";

  return (
    <section className={styles.banner} aria-label="Sesión ATLAS DataGob">
      <div>
        <span className={styles.eyebrow}>Sesión</span>
        <strong>{status === "loading" ? "Resolviendo identidad..." : session.user}</strong>
      </div>
      <div className={styles.meta}>
        <span>{modeLabel}</span>
        <span>{rolesLabel}</span>
        <span>{session.authenticated ? "Autenticado" : "Modo demo"}</span>
      </div>
      {status === "error" ? <span className={styles.warning}>No se pudo leer /api/session</span> : null}
    </section>
  );
}
