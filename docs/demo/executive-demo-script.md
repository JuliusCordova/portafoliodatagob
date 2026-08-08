# ATLAS DataGob · Guion ejecutivo de demo

## Objetivo de la demo

Mostrar cómo ATLAS DataGob convierte una demanda de datos en un flujo gobernado, trazable y priorizable, desde la captura del Data Owner hasta la decisión del Comité Operativo y la visibilidad ejecutiva.

La demo no busca mostrar una pantalla bonita aislada. Busca demostrar un proceso completo:

```text
Negocio solicita
→ ATLAS estructura y valida
→ Comité revisa y completa gobierno
→ ATLAS calcula score con supuestos explícitos
→ Comité Estratégico prioriza con evidencia
```

## Audiencia objetivo

- Comité Operativo de Datos.
- Comité Estratégico de Datos / IA.
- Data Owners.
- Data Stewards.
- Arquitectura de Datos.
- Líderes de negocio que consumen tableros, data products, modelos o agentes.

## Mensaje central

> ATLAS DataGob reduce la fricción entre negocio, datos, arquitectura y gobierno. No reemplaza al comité: lo equipa con evidencia, trazabilidad y priorización objetiva.

## Preparación previa

Antes de la demo:

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
make seed-demo
make dev-api
```

En otra terminal:

```bash
cd ~/portafoliodatagob/apps/web
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

En Cloud Shell, abrir Web Preview en el puerto 3000.

## Estructura sugerida de 12 minutos

| Minuto | Escena | Objetivo |
| --- | --- | --- |
| 0:00–1:00 | Apertura | Explicar el problema de gobierno de demanda. |
| 1:00–3:00 | Intake negocio | Mostrar cómo el Data Owner registra valor y supuestos. |
| 3:00–6:00 | Comité Operativo | Filtrar, revisar, validar y completar checklist. |
| 6:00–8:00 | Cálculo de score | Mostrar que ATLAS calcula con datos explícitos. |
| 8:00–10:30 | Tablero Ejecutivo | Priorizar portafolio con KPIs, Top casos y brechas. |
| 10:30–12:00 | Cierre | Resumir valor, gobierno y próximos pasos. |

## Escena 1 · Apertura

### Qué decir

“Hoy muchas organizaciones reciben demandas de datos por correo, reuniones o conversaciones informales. El problema no es solo capturar la solicitud; el problema es decidir qué avanzar, con qué evidencia, bajo qué gobierno y con qué valor esperado.”

“ATLAS DataGob ordena ese proceso en una experiencia gobernada: intake, validación, comité, scoring y tablero ejecutivo.”

### Qué mostrar

- Pantalla inicial de ATLAS.
- Tres vistas separadas: Intake negocio, Comité operativo y Tablero ejecutivo.
- Control global de demo para resetear datos sintéticos.

## Escena 2 · Intake negocio

### Qué decir

“El Data Owner no llena una matriz fría. ATLAS lo guía como una conversación/checklist para capturar la solicitud, el valor operativo, el impacto estratégico y los supuestos económicos.”

“Estos datos no son decorativos: quedan persistidos como parte del modelo de demanda y luego serán validados por el Comité Operativo.”

### Qué mostrar

- Vista `Intake negocio`.
- Campos de solicitud.
- Checklist de impacto operativo, impacto estratégico, ROI, VAN, TIR y payback.
- Botón `Enviar a Comité Operativo`.

### Mensaje clave

> El negocio declara el valor; el comité lo valida antes de usarlo para priorizar.

## Escena 3 · Comité Operativo

### Qué decir

“Una vez registrada la solicitud, el Comité Operativo trabaja desde una grilla CRUD. Puede filtrar por área, dominio, estado o prioridad, seleccionar una demanda, revisar los inputs del Data Owner y completar el checklist técnico y de gobierno.”

“El comité no vuelve a pedir todo desde cero: trabaja sobre la evidencia capturada y la completa con criterios de datos, arquitectura, esfuerzo, riesgo y reutilización.”

### Qué mostrar

- Vista `Comité operativo`.
- Filtros por área, dominio, estado y prioridad.
- Seleccionar `DEM-DEMO-002`.
- Panel lateral.
- Checklist Data Owner.
- Checklist Comité Operativo:
  - disponibilidad/calidad de datos,
  - viabilidad técnica,
  - esfuerzo,
  - riesgo/control,
  - reutilización.

### Mensaje clave

> El comité deja de operar por intuición y empieza a operar con un expediente digital trazable.

## Escena 4 · Cálculo de score

### Qué decir

“ATLAS no inventa VAN, TIR, ROI ni payback. Usa los supuestos económicos declarados por el Data Owner y validados por el Comité. Luego calcula un score gobernado y deja un evento auditable.”

### Qué mostrar

- Botón de recalcular score.
- Resultado de score y prioridad.
- Cambio de estado a `scored`.
- Timeline/eventos.

### Mensaje clave

> La IA propone y calcula; el gobierno humano valida y decide.

## Escena 5 · Tablero Ejecutivo

### Qué decir

“Una vez que las demandas tienen estado, score y valor económico, el Comité Operativo y el Comité Estratégico pueden ver el portafolio completo: prioridades, score promedio, top iniciativas, VAN y brechas acumuladas.”

“Esto permite decidir qué casos avanzan, cuáles se reformulan y cuáles se rechazan con trazabilidad.”

### Qué mostrar

- Vista `Tablero ejecutivo`.
- KPIs principales.
- Top 5 de casos.
- Distribución por prioridad.
- Score vs benchmark.
- Brechas agregadas.

### Mensaje clave

> El tablero no es reporting: es una sala de decisión para priorizar inversión en datos.

## Escena 6 · Cierre

### Qué decir

“ATLAS DataGob industrializa el gobierno de la demanda: captura valor desde negocio, valida arquitectura y políticas, habilita revisión de comité, calcula score con datos explícitos y entrega una vista ejecutiva para priorizar.”

“Lo importante no es solo la automatización. Lo importante es que cada decisión queda trazada.”

## Cierre recomendado

> ATLAS DataGob no reemplaza el gobierno de datos. Lo convierte en un sistema operativo para decidir mejor, más rápido y con evidencia.
