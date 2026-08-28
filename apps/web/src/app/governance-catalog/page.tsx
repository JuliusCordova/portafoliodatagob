"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductNavigation from "../components/ProductNavigation";
import styles from "./GovernanceCatalog.module.css";

type CatalogKind = "policies" | "architecture_patterns";
type Tab = CatalogKind | "audit";

type WebSession = {
  user: string;
  roles: string[];
};

type GovernanceRecord = {
  id: string;
  version: string;
  status: "draft" | "active" | "retired";
  name: string;
  applies_to?: { project_types?: string[] };
  project_types?: string[];
  mandatory_controls?: string[];
  recommendation?: string;
  required_components?: string[];
  gcp_services?: string[];
  principle?: string;
  updated_at?: string;
  updated_by?: string;
};

type CatalogResponse = {
  catalog_kind: CatalogKind;
  generation: number;
  source: string;
  count: number;
  records: GovernanceRecord[];
};

type AuditEvent = {
  event_id: string;
  timestamp: string;
  catalog_kind: CatalogKind;
  action: string;
  actor: string;
  change_note: string;
  record_id: string;
  version: string;
  generation_before: number;
};

type AuditResponse = {
  source: string;
  count: number;
  events: AuditEvent[];
};

type EditorState = {
  mode: "create" | "edit";
  kind: CatalogKind;
  originalId?: string;
  originalVersion?: string;
  id: string;
  version: string;
  name: string;
  projectTypes: string;
  detailOne: string;
  detailTwo: string;
  changeNote: string;
};

type Feedback = { tone: "success" | "error" | "info"; message: string } | null;

function listToText(values?: string[]) {
  return (values ?? []).join(", ");
}

function textToList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function statusLabel(status: GovernanceRecord["status"]) {
  if (status === "active") return "Activa";
  if (status === "draft") return "Borrador";
  return "Retirada";
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    draft_created: "Borrador creado",
    draft_updated: "Borrador actualizado",
    draft_deleted: "Borrador eliminado",
    version_cloned: "Nueva versión creada",
    version_activated: "Versión activada",
    version_retired: "Versión retirada"
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function makeEditor(kind: CatalogKind): EditorState {
  return {
    mode: "create",
    kind,
    id: "",
    version: "1.0",
    name: "",
    projectTypes: "",
    detailOne: "",
    detailTwo: "",
    changeNote: ""
  };
}

function recordToEditor(kind: CatalogKind, record: GovernanceRecord): EditorState {
  return {
    mode: "edit",
    kind,
    originalId: record.id,
    originalVersion: record.version,
    id: record.id,
    version: record.version,
    name: record.name,
    projectTypes: listToText(
      kind === "policies" ? record.applies_to?.project_types : record.project_types
    ),
    detailOne: listToText(
      kind === "policies" ? record.mandatory_controls : record.required_components
    ),
    detailTwo: kind === "policies" ? record.recommendation ?? "" : listToText(record.gcp_services),
    changeNote: ""
  };
}

export default function GovernanceCatalogPage() {
  const [session, setSession] = useState<WebSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("policies");
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const isCommittee = useMemo(
    () => Boolean(session?.roles.includes("committee_member")),
    [session]
  );

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as { session: WebSession };
        if (mounted) setSession(payload.session);
      } finally {
        if (mounted) setSessionLoaded(true);
      }
    }
    void loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const loadTab = useCallback(async (nextTab: Tab) => {
    setLoading(true);
    setFeedback(null);
    try {
      const endpoint =
        nextTab === "audit"
          ? "/api/governance-catalog?view=audit&limit=200"
          : `/api/governance-catalog?kind=${nextTab}`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
      if (nextTab === "audit") {
        setAudit(JSON.parse(text) as AuditResponse);
      } else {
        setCatalog(JSON.parse(text) as CatalogResponse);
      }
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cargar el catálogo"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoaded && isCommittee) void loadTab(tab);
  }, [sessionLoaded, isCommittee, tab, loadTab]);

  async function mutate(payload: Record<string, unknown>, successMessage: string) {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/governance-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
      setFeedback({ tone: "success", message: successMessage });
      setEditor(null);
      await loadTab(tab);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo completar la operación"
      });
    } finally {
      setLoading(false);
    }
  }

  function recordPayload(state: EditorState) {
    const base = {
      id: state.id.trim(),
      version: state.version.trim(),
      status: "draft",
      name: state.name.trim()
    };
    if (state.kind === "policies") {
      return {
        ...base,
        applies_to: { project_types: textToList(state.projectTypes) },
        mandatory_controls: textToList(state.detailOne),
        recommendation: state.detailTwo.trim()
      };
    }
    return {
      ...base,
      project_types: textToList(state.projectTypes),
      required_components: textToList(state.detailOne),
      gcp_services: textToList(state.detailTwo),
      principle: state.name.trim()
    };
  }

  async function saveEditor() {
    if (!editor) return;
    if (!editor.id.trim() || !editor.version.trim() || !editor.name.trim() || !editor.changeNote.trim()) {
      setFeedback({ tone: "error", message: "Completa ID, versión, nombre y motivo del cambio." });
      return;
    }
    if (editor.kind === "architecture_patterns" && !editor.detailTwo.trim()) {
      setFeedback({ tone: "error", message: "Agrega al menos un servicio GCP." });
      return;
    }

    if (editor.mode === "create") {
      await mutate(
        {
          operation: "create",
          kind: editor.kind,
          record: recordPayload(editor),
          change_note: editor.changeNote
        },
        "Borrador creado. Aún no afecta al Intake conversacional."
      );
      return;
    }

    const full = recordPayload(editor);
    const { id: _id, version: _version, status: _status, ...patch } = full;
    await mutate(
      {
        operation: "update",
        kind: editor.kind,
        record_id: editor.originalId,
        version: editor.originalVersion,
        patch,
        change_note: editor.changeNote
      },
      "Borrador actualizado."
    );
  }

  async function runRowAction(operation: "delete" | "activate" | "retire", record: GovernanceRecord) {
    const verb = operation === "delete" ? "eliminar este borrador" : operation === "activate" ? "activar esta versión" : "retirar esta versión";
    if (!window.confirm(`¿Confirmas ${verb}: ${record.id}@${record.version}?`)) return;
    const note = window.prompt("Motivo del cambio (obligatorio):")?.trim();
    if (!note) return;
    await mutate(
      {
        operation,
        kind: tab,
        record_id: record.id,
        version: record.version,
        change_note: note
      },
      operation === "activate"
        ? "Versión activada. Los nuevos Intakes usarán esta definición."
        : operation === "retire"
          ? "Versión retirada del uso futuro; se conserva para trazabilidad."
          : "Borrador eliminado."
    );
  }

  async function cloneRecord(record: GovernanceRecord) {
    const newVersion = window.prompt(`Nueva versión para ${record.id}:`, "1.1")?.trim();
    if (!newVersion) return;
    const note = window.prompt("Motivo de creación de la nueva versión (obligatorio):")?.trim();
    if (!note) return;
    await mutate(
      {
        operation: "clone",
        kind: tab,
        record_id: record.id,
        version: record.version,
        new_version: newVersion,
        change_note: note
      },
      `Se creó ${record.id}@${newVersion} como borrador.`
    );
  }

  if (!sessionLoaded) {
    return <main className={styles.centerState}>Validando acceso al Comité Operativo…</main>;
  }

  if (!isCommittee) {
    return (
      <main className={styles.restricted}>
        <div className={styles.restrictedCard}>
          <span className={styles.eyebrow}>ATLAS DataGob · Acceso restringido</span>
          <h1>Catálogo de Gobierno</h1>
          <p>Esta capacidad es de uso exclusivo de miembros del Comité Operativo.</p>
          <p className={styles.muted}>
            Los usuarios de negocio pueden consultar las políticas vigentes únicamente a través del Intake conversacional de ATLAS.
          </p>
          <a href="/intake" className={styles.primaryLink}>Ir al Intake conversacional</a>
        </div>
      </main>
    );
  }

  const records = catalog?.records ?? [];
  const activeCount = records.filter((item) => item.status === "active").length;
  const draftCount = records.filter((item) => item.status === "draft").length;
  const retiredCount = records.filter((item) => item.status === "retired").length;

  return (
    <main className={styles.page}>
      <ProductNavigation />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Comité Operativo · Control Plane</span>
          <h1>Catálogo de Gobierno</h1>
          <p>
            Mantén políticas y patrones de arquitectura versionados sin editar Cloud Storage manualmente.
            Solo las versiones activas son consumidas por el agente conversacional.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span>Usuario autorizado</span>
          <strong>{session?.user}</strong>
          <small>Rol: committee_member</small>
        </div>
      </section>

      <section className={styles.tabs} aria-label="Catálogo de gobierno">
        <button className={tab === "policies" ? styles.tabActive : styles.tab} onClick={() => { setTab("policies"); setEditor(null); }}>
          Políticas
        </button>
        <button className={tab === "architecture_patterns" ? styles.tabActive : styles.tab} onClick={() => { setTab("architecture_patterns"); setEditor(null); }}>
          Patrones de arquitectura
        </button>
        <button className={tab === "audit" ? styles.tabActive : styles.tab} onClick={() => { setTab("audit"); setEditor(null); }}>
          Historial / Auditoría
        </button>
      </section>

      {feedback ? <div className={`${styles.feedback} ${styles[feedback.tone]}`}>{feedback.message}</div> : null}

      {tab !== "audit" ? (
        <>
          <section className={styles.metrics}>
            <article><span>Activas</span><strong>{activeCount}</strong></article>
            <article><span>Borradores</span><strong>{draftCount}</strong></article>
            <article><span>Retiradas</span><strong>{retiredCount}</strong></article>
            <article><span>Generación GCS</span><strong>{catalog?.generation ?? "—"}</strong></article>
          </section>

          <section className={styles.toolbar}>
            <div>
              <h2>{tab === "policies" ? "Políticas gobernadas" : "Patrones de arquitectura aprobados"}</h2>
              <p>Draft → Active → Retired. Las versiones históricas nunca se borran.</p>
            </div>
            <button className={styles.primaryButton} onClick={() => setEditor(makeEditor(tab))}>
              + {tab === "policies" ? "Nueva política" : "Nuevo patrón"}
            </button>
          </section>

          {editor ? (
            <section className={styles.editor}>
              <div className={styles.editorHeader}>
                <div>
                  <span className={styles.eyebrow}>{editor.mode === "create" ? "Nuevo borrador" : "Editar borrador"}</span>
                  <h3>{editor.kind === "policies" ? "Política" : "Patrón de arquitectura"}</h3>
                </div>
                <button className={styles.ghostButton} onClick={() => setEditor(null)}>Cerrar</button>
              </div>
              <div className={styles.formGrid}>
                <label>ID<input value={editor.id} disabled={editor.mode === "edit"} onChange={(e) => setEditor({ ...editor, id: e.target.value })} placeholder={editor.kind === "policies" ? "ML-002" : "GCP-STREAMING-001"} /></label>
                <label>Versión<input value={editor.version} disabled={editor.mode === "edit"} onChange={(e) => setEditor({ ...editor, version: e.target.value })} placeholder="1.0" /></label>
                <label className={styles.span2}>Nombre<input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="Nombre ejecutivo y claro" /></label>
                <label className={styles.span2}>Tipos de proyecto<input value={editor.projectTypes} onChange={(e) => setEditor({ ...editor, projectTypes: e.target.value })} placeholder="machine_learning, generative_ai" /></label>
                <label className={styles.span2}>{editor.kind === "policies" ? "Controles obligatorios" : "Componentes requeridos"}<textarea value={editor.detailOne} onChange={(e) => setEditor({ ...editor, detailOne: e.target.value })} placeholder="Separados por coma" /></label>
                <label className={styles.span2}>{editor.kind === "policies" ? "Recomendación" : "Servicios GCP"}<textarea value={editor.detailTwo} onChange={(e) => setEditor({ ...editor, detailTwo: e.target.value })} placeholder={editor.kind === "policies" ? "Qué debe cumplir la iniciativa" : "Cloud Storage, BigQuery, Vertex AI"} /></label>
                <label className={styles.span2}>Motivo del cambio<textarea value={editor.changeNote} onChange={(e) => setEditor({ ...editor, changeNote: e.target.value })} placeholder="Obligatorio para auditoría" /></label>
              </div>
              <div className={styles.editorActions}>
                <button className={styles.primaryButton} disabled={loading} onClick={() => void saveEditor()}>{loading ? "Guardando…" : "Guardar borrador"}</button>
                <small>Guardar un borrador no cambia el comportamiento del Intake.</small>
              </div>
            </section>
          ) : null}

          <section className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr><th>ID</th><th>Nombre</th><th>Versión</th><th>Estado</th><th>Aplica a</th><th>Detalle</th><th>Actualización</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={`${record.id}-${record.version}`}>
                      <td><strong>{record.id}</strong></td>
                      <td>{record.name}</td>
                      <td>{record.version}</td>
                      <td><span className={`${styles.status} ${styles[`status_${record.status}`]}`}>{statusLabel(record.status)}</span></td>
                      <td>{listToText(tab === "policies" ? record.applies_to?.project_types : record.project_types) || "—"}</td>
                      <td>{tab === "policies" ? `${record.mandatory_controls?.length ?? 0} controles` : `${record.required_components?.length ?? 0} componentes · ${record.gcp_services?.length ?? 0} servicios`}</td>
                      <td><span>{formatDate(record.updated_at)}</span><small>{record.updated_by ?? "—"}</small></td>
                      <td>
                        <div className={styles.rowActions}>
                          {record.status === "draft" ? <button onClick={() => setEditor(recordToEditor(tab, record))}>Editar</button> : null}
                          {record.status === "draft" ? <button onClick={() => void runRowAction("activate", record)}>Activar</button> : null}
                          {record.status === "draft" ? <button className={styles.dangerAction} onClick={() => void runRowAction("delete", record)}>Eliminar draft</button> : null}
                          {record.status !== "draft" ? <button onClick={() => void cloneRecord(record)}>Nueva versión</button> : null}
                          {record.status === "active" ? <button className={styles.dangerAction} onClick={() => void runRowAction("retire", record)}>Retirar</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!records.length && !loading ? <tr><td colSpan={8} className={styles.empty}>No hay registros en este catálogo.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.auditCard}>
          <div className={styles.toolbar}>
            <div><h2>Historial inmutable</h2><p>Actor, acción, versión y motivo de cada cambio gobernado.</p></div>
            <button className={styles.ghostButton} onClick={() => void loadTab("audit")}>Actualizar</button>
          </div>
          <div className={styles.auditList}>
            {(audit?.events ?? []).map((event) => (
              <article key={event.event_id}>
                <div className={styles.auditHead}>
                  <span>{actionLabel(event.action)}</span>
                  <time>{formatDate(event.timestamp)}</time>
                </div>
                <strong>{event.record_id}@{event.version}</strong>
                <p>{event.change_note}</p>
                <small>{event.actor} · {event.catalog_kind.replaceAll("_", " ")}</small>
              </article>
            ))}
            {!audit?.events?.length && !loading ? <div className={styles.empty}>Aún no hay eventos de administración.</div> : null}
          </div>
        </section>
      )}

      {loading ? <div className={styles.loadingBar}>Actualizando catálogo gobernado…</div> : null}
    </main>
  );
}
