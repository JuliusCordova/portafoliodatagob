const metrics = [
  { label: 'Demandas activas', value: '12' },
  { label: 'Alta prioridad', value: '4' },
  { label: 'En comité', value: '3' },
  { label: 'MVP Gate', value: '2' }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-10">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">ATLAS DataGob</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Demand governance agentic platform</h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Intake, clasificación, scoring, comités y gates de MVP a producción con enfoque Figma-first.
            </p>
          </div>
          <div className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600">Sprint 02 scaffold</div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Nueva solicitud</h2>
            <p className="mt-2 text-sm text-slate-600">
              El chatbot de intake guiará al usuario para convertir una idea ambigua en una iniciativa clasificada.
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
              “Necesito un tablero para calidad de clientes y validar si ya existe algo parecido.”
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Clasificación sugerida</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Gobierno de datos</span><strong>Alta confianza</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Casos similares</span><strong>3 encontrados</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Decisión</span><strong>Requiere comité</strong>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
