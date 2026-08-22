"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export type Deployment = {
  deployment_id: string;
  provider_deployment_id: string;
  display_name: string;
  framework: string;
  service_account?: string | null;
  deployment_source_kind?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
  binding_status: string;
  governed_agent_id?: string | null;
  discovery_status?: string;
};

export type Finding = {
  finding_id: string;
  title: string;
  severity: string;
  status: string;
  policy_id?: string | null;
  policy_version?: string | null;
};

export type Binding = {
  binding_id: string;
  deployment_id: string;
  environment?: string | null;
  is_current?: boolean;
  bound_at?: string;
};

export type GovernanceProfile = {
  business_owner?: string | null;
  technical_owner?: string | null;
  business_purpose?: string | null;
  business_area?: string | null;
  environment?: string | null;
  business_criticality?: string | null;
  autonomy_level?: string | null;
  risk_level?: string | null;
  data_classification?: string[];
  human_oversight?: string | null;
  writes_to_systems?: boolean | null;
  applicable_policies?: string[];
  required_controls?: string[];
  governance_status?: string;
  last_assessed_at?: string | null;
  next_review_at?: string | null;
  last_assessment?: { score?: number; checks?: Record<string, boolean>; policy_refs?: string[] };
  notes?: string | null;
};

export type GovernedAgent = {
  agent_id: string;
  canonical_name: string;
  description?: string | null;
  governance_status: string;
  governance_profile?: GovernanceProfile;
  bindings?: Binding[];
  deployments?: Deployment[];
  findings?: Finding[];
  updated_at?: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/agent-governance/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : JSON.stringify(payload?.detail ?? payload);
    throw new Error(detail || `${response.status} ${response.statusText}`);
  }
  return payload as T;
}

function humanDate(value?: string | null) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function statusLabel(value?: string | null) {
  return (value || "not_assessed").replaceAll("_", " ");
}

export function DeploymentDrawer({
  deployment,
  agents,
  onClose,
  onChanged
}: {
  deployment: Deployment;
  agents: GovernedAgent[];
  onClose: () => void;
  onChanged: (agentId: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"existing" | "new">(agents.length ? "existing" : "new");
  const [agentId, setAgentId] = useState(agents[0]?.agent_id ?? "");
  const [canonicalName, setCanonicalName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function associate() {
    setBusy(true);
    setError(null);
    try {
      let targetAgentId = agentId;
      if (mode === "new") {
        const created = await api<{ agent: GovernedAgent }>("agents", {
          method: "POST",
          body: JSON.stringify({ canonical_name: canonicalName, description: description || null })
        });
        targetAgentId = created.agent.agent_id;
      }
      if (!targetAgentId) throw new Error("Selecciona o crea una identidad gobernada.");
      await api(`agents/${encodeURIComponent(targetAgentId)}/deployments/bind`, {
        method: "POST",
        body: JSON.stringify({
          deployment_id: deployment.deployment_id,
          environment: environment || null,
          is_current: isCurrent
        })
      });
      await onChanged(targetAgentId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={styles.drawer} aria-label="Detalle de deployment">
      <DrawerHeader eyebrow="Deployment ADK observado" title={deployment.display_name} onClose={onClose} />
      <div className={styles.drawerBody}>
        <div className={styles.detailGrid}>
          <Metric label="Provider ID" value={deployment.provider_deployment_id} />
          <Metric label="Framework" value="Google ADK" />
          <Metric label="Service Account" value={deployment.service_account ?? "No disponible"} />
          <Metric label="Source" value={deployment.deployment_source_kind ?? "No disponible"} />
          <Metric label="Creado" value={humanDate(deployment.created_at)} />
          <Metric label="Binding" value={statusLabel(deployment.binding_status)} />
        </div>
        {deployment.binding_status === "bound" ? (
          <div className={styles.calloutGood}>Asociado a {deployment.governed_agent_id}. El gobierno se administra en la identidad lógica.</div>
        ) : (
          <section className={styles.formSection}>
            <h3>Resolver identidad gobernada</h3>
            <p>ATLAS no deduce automáticamente qué candidatos pertenecen al mismo agente.</p>
            <div className={styles.segmented}>
              <button className={mode === "existing" ? styles.selected : ""} disabled={!agents.length} onClick={() => setMode("existing")}>Asociar existente</button>
              <button className={mode === "new" ? styles.selected : ""} onClick={() => setMode("new")}>Crear identidad</button>
            </div>
            {mode === "existing" ? (
              <label>Agente gobernado<select value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.canonical_name}</option>)}</select></label>
            ) : (
              <>
                <label>Nombre canónico<input value={canonicalName} onChange={(event) => setCanonicalName(event.target.value)} placeholder="Ej. Ayniq IaC Agent" /></label>
                <label>Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Propósito técnico/funcional breve" /></label>
              </>
            )}
            <label>Ambiente declarado<select value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="">No declarado</option><option value="development">Development</option><option value="qa">QA</option><option value="production">Production</option></select></label>
            <label className={styles.checkbox}><input type="checkbox" checked={isCurrent} onChange={(event) => setIsCurrent(event.target.checked)} />Marcar como deployment vigente de esta identidad</label>
            {error ? <div className={styles.inlineError}>{error}</div> : null}
            <button className={styles.primaryButton} disabled={busy || (mode === "new" && canonicalName.trim().length < 3)} onClick={associate}>{busy ? "Guardando..." : "Confirmar asociación"}</button>
          </section>
        )}
      </div>
    </aside>
  );
}

export function AgentDrawer({
  agent,
  onClose,
  onChanged
}: {
  agent: GovernedAgent;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const profile = agent.governance_profile ?? {};
  const [form, setForm] = useState<Record<string, string>>({});
  const [writesToSystems, setWritesToSystems] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentId = agent.agent_id;

  useEffect(() => {
    setForm({
      business_owner: profile.business_owner ?? "",
      technical_owner: profile.technical_owner ?? "",
      business_purpose: profile.business_purpose ?? "",
      business_area: profile.business_area ?? "",
      environment: profile.environment ?? "",
      business_criticality: profile.business_criticality ?? "not_assessed",
      autonomy_level: profile.autonomy_level ?? "not_assessed",
      risk_level: profile.risk_level ?? "not_assessed",
      data_classification: (profile.data_classification ?? []).join(", "),
      human_oversight: profile.human_oversight ?? "not_assessed",
      required_controls: (profile.required_controls ?? []).join(", "),
      next_review_at: profile.next_review_at?.slice(0, 10) ?? "",
      notes: profile.notes ?? ""
    });
    setWritesToSystems(profile.writes_to_systems === true ? "true" : profile.writes_to_systems === false ? "false" : "");
  }, [agent, profile.business_area, profile.business_criticality, profile.business_owner, profile.business_purpose, profile.data_classification, profile.environment, profile.human_oversight, profile.next_review_at, profile.notes, profile.required_controls, profile.risk_level, profile.technical_owner, profile.autonomy_level, profile.writes_to_systems]);

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    setBusy(true); setError(null);
    try {
      await api(`agents/${encodeURIComponent(agentId)}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          business_owner: form.business_owner || null,
          technical_owner: form.technical_owner || null,
          business_purpose: form.business_purpose || null,
          business_area: form.business_area || null,
          environment: form.environment || null,
          business_criticality: form.business_criticality,
          autonomy_level: form.autonomy_level,
          risk_level: form.risk_level,
          data_classification: (form.data_classification || "").split(",").map((item) => item.trim()).filter(Boolean),
          human_oversight: form.human_oversight,
          writes_to_systems: writesToSystems === "" ? null : writesToSystems === "true",
          required_controls: (form.required_controls || "").split(",").map((item) => item.trim()).filter(Boolean),
          next_review_at: form.next_review_at ? `${form.next_review_at}T23:59:59+00:00` : null,
          notes: form.notes || null
        })
      });
      await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  async function assess() {
    setBusy(true); setError(null);
    try {
      await api(`agents/${encodeURIComponent(agentId)}/assess`, { method: "POST" });
      await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  return (
    <aside className={styles.drawer} aria-label="Detalle de agente gobernado">
      <DrawerHeader eyebrow={agentId} title={agent.canonical_name} onClose={onClose} />
      <div className={styles.drawerBody}>
        <div className={styles.detailGrid}>
          <Metric label="Gobierno" value={statusLabel(profile.governance_status)} />
          <Metric label="Risk" value={statusLabel(profile.risk_level)} />
          <Metric label="Autonomía" value={statusLabel(profile.autonomy_level)} />
          <Metric label="Score" value={profile.last_assessment?.score != null ? `${profile.last_assessment.score}%` : "No evaluado"} />
          <Metric label="Deployments" value={String(agent.deployments?.length ?? 0)} />
          <Metric label="Findings" value={String(agent.findings?.filter((item) => item.status === "open").length ?? 0)} />
        </div>

        <section className={styles.formSection}>
          <h3>Perfil de gobierno</h3>
          <div className={styles.twoColumns}>
            <label>Business Owner<input value={form.business_owner ?? ""} onChange={(event) => setField("business_owner", event.target.value)} /></label>
            <label>Technical Owner<input value={form.technical_owner ?? ""} onChange={(event) => setField("technical_owner", event.target.value)} /></label>
          </div>
          <label>Propósito de negocio<textarea value={form.business_purpose ?? ""} onChange={(event) => setField("business_purpose", event.target.value)} /></label>
          <div className={styles.twoColumns}>
            <label>Área<input value={form.business_area ?? ""} onChange={(event) => setField("business_area", event.target.value)} /></label>
            <label>Ambiente<input value={form.environment ?? ""} onChange={(event) => setField("environment", event.target.value)} /></label>
            <label>Criticidad<select value={form.business_criticality ?? "not_assessed"} onChange={(event) => setField("business_criticality", event.target.value)}><option value="not_assessed">No evaluado</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label>Riesgo<select value={form.risk_level ?? "not_assessed"} onChange={(event) => setField("risk_level", event.target.value)}><option value="not_assessed">No evaluado</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label>Autonomía<select value={form.autonomy_level ?? "not_assessed"} onChange={(event) => setField("autonomy_level", event.target.value)}><option value="not_assessed">No evaluado</option><option value="l0">L0 · Inform</option><option value="l1">L1 · Recommend</option><option value="l2">L2 · Prepare</option><option value="l3">L3 · Execute bounded</option><option value="l4">L4 · Autonomous</option></select></label>
            <label>Supervisión humana<select value={form.human_oversight ?? "not_assessed"} onChange={(event) => setField("human_oversight", event.target.value)}><option value="not_assessed">No evaluado</option><option value="required">Required</option><option value="conditional">Conditional</option><option value="not_required">Not required</option></select></label>
            <label>Escribe en sistemas<select value={writesToSystems} onChange={(event) => setWritesToSystems(event.target.value)}><option value="">No evaluado</option><option value="false">No</option><option value="true">Sí</option></select></label>
            <label>Próxima revisión<input type="date" value={form.next_review_at ?? ""} onChange={(event) => setField("next_review_at", event.target.value)} /></label>
          </div>
          <label>Clasificación de datos<input value={form.data_classification ?? ""} onChange={(event) => setField("data_classification", event.target.value)} placeholder="internal, confidential, pii" /></label>
          <label>Controles con evidencia<input value={form.required_controls ?? ""} onChange={(event) => setField("required_controls", event.target.value)} placeholder="Separados por coma" /></label>
          <label>Notas<textarea value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value)} /></label>
          {error ? <div className={styles.inlineError}>{error}</div> : null}
          <div className={styles.actionRow}>
            <button className={styles.secondaryButton} disabled={busy} onClick={saveProfile}>Guardar perfil</button>
            <button className={styles.primaryButton} disabled={busy} onClick={assess}>Ejecutar assessment</button>
          </div>
        </section>

        <section className={styles.drawerSection}>
          <h3>Políticas aplicables</h3>
          <div className={styles.chipList}>{(profile.applicable_policies ?? []).length ? profile.applicable_policies?.map((item) => <span className={styles.chip} key={item}>{item}</span>) : <span>No evaluado</span>}</div>
        </section>

        <section className={styles.drawerSection}>
          <h3>Deployments vinculados</h3>
          {(agent.deployments ?? []).map((deployment) => <div className={styles.listRow} key={deployment.deployment_id}><div><strong>{deployment.display_name}</strong><small>{deployment.provider_deployment_id}</small></div><span>{deployment.binding_status}</span></div>)}
          {!agent.deployments?.length ? <p>No hay deployments vinculados.</p> : null}
        </section>

        <section className={styles.drawerSection}>
          <h3>Hallazgos</h3>
          {(agent.findings ?? []).map((finding) => <div className={styles.findingRow} key={finding.finding_id}><span className={styles.severity}>{finding.severity}</span><div><strong>{finding.title}</strong><small>{finding.policy_id ? `${finding.policy_id}@${finding.policy_version}` : "Control de gobierno"}</small></div></div>)}
          {!agent.findings?.length ? <p>Sin hallazgos persistidos.</p> : null}
        </section>
      </div>
    </aside>
  );
}

function DrawerHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return <header className={styles.drawerHeader}><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Cerrar detalle">×</button></header>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}
