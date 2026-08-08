"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./ProductNavigation.module.css";

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

type NavigationItem = {
  href: string;
  label: string;
  description: string;
  requiredRoles?: string[];
  guardrail?: string;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard principal",
    description: "Intake, backlog, scoring y vista ejecutiva"
  },
  {
    href: "/committee",
    label: "Comité operativo",
    description: "Decisión final, justificación y trazabilidad",
    requiredRoles: ["committee_member", "data_architect", "platform_admin"],
    guardrail: "Requiere rol de comité o arquitectura para decidir"
  },
  {
    href: "/sponsor-review",
    label: "Sponsor review",
    description: "Paquete ejecutivo imprimible y evidencia de decisión",
    requiredRoles: ["executive", "committee_member", "data_architect", "platform_admin"],
    guardrail: "Requiere rol ejecutivo, comité o arquitectura para revisar paquetes"
  }
];

function hasAccess(roles: string[], requiredRoles?: string[]) {
  if (!requiredRoles?.length) return true;
  return roles.includes("platform_admin") || requiredRoles.some((role) => roles.includes(role));
}

function roleLabel(roles: string[]) {
  if (!roles.length) return "Sin rol";
  if (roles.includes("platform_admin")) return "Admin";
  if (roles.includes("committee_member")) return "Comité";
  if (roles.includes("data_architect")) return "Arquitectura";
  if (roles.includes("executive")) return "Ejecutivo";
  if (roles.includes("data_steward")) return "Steward";
  if (roles.includes("data_owner")) return "Owner";
  return roles[0].replaceAll("_", " ");
}

export default function ProductNavigation() {
  const [session, setSession] = useState<WebSession | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as SessionResponse;
        if (mounted) setSession(payload.session);
      } catch {
        if (mounted) setSession(null);
      }
    }
    void loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const roles = useMemo(() => session?.roles ?? [], [session]);
  const currentRoleLabel = roleLabel(roles);

  return (
    <nav className={styles.shell} aria-label="ATLAS product navigation">
      <div className={styles.brandBlock}>
        <span className={styles.eyebrow}>ATLAS DataGob</span>
        <strong>Demand Governance Cockpit</strong>
        <small className={styles.sessionHint}>
          {session ? `${currentRoleLabel} · ${session.user}` : "Sesión cargando"}
        </small>
      </div>
      <div className={styles.links}>
        {navigationItems.map((item) => {
          const allowed = hasAccess(roles, item.requiredRoles);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.link} ${allowed ? styles.allowed : styles.restricted}`}
              aria-label={allowed ? item.label : `${item.label}. ${item.guardrail}`}
            >
              <span>{item.label}</span>
              <small>{allowed ? item.description : item.guardrail ?? item.description}</small>
              {item.requiredRoles?.length ? (
                <em className={allowed ? styles.accessOk : styles.accessWarn}>{allowed ? "Acción habilitada" : "Acceso restringido"}</em>
              ) : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
