import Link from "next/link";
import ConversationalIntake from "../components/ConversationalIntake";

export default function ConversationalIntakePage() {
  return (
    <main className="app-shell">
      <section className="app-hero">
        <div>
          <p className="eyebrow">ATLAS DataGob · Feature 54</p>
          <h1>Intake conversacional gobernado</h1>
          <p className="hero-copy">
            Explica tu necesidad en lenguaje de negocio. ATLAS la convierte en un Caso de Negocio,
            consulta especialistas de datos, arquitectura y políticas, y solo registra el requerimiento
            cuando tú confirmas que la definición es correcta.
          </p>
        </div>
        <aside className="hero-panel">
          <span>Orquestación</span>
          <strong>Gemini ADK</strong>
          <small>Conversación inteligente · gobierno determinístico</small>
        </aside>
      </section>

      <nav className="view-tabs" aria-label="Navegación de ATLAS DataGob">
        <Link className="active" href="/intake">Intake conversacional</Link>
        <Link href="/">Portafolio y comités</Link>
      </nav>

      <ConversationalIntake />
    </main>
  );
}
