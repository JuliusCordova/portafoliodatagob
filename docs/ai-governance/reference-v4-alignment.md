# Arquitectura agéntica v4 — análisis y evolución de ATLAS DataGob

Estado: análisis documental y diseño propuesto; no habilita nuevas funciones en runtime.
Fecha: 2026-10-08.
Fuente: PDF suministrado por el usuario, "Kyndryl_Arquitectura_Agentica_Referencia_v4.pdf", octubre de 2026, 64 páginas.
Baseline examinado: README, SPEC-059, documentación F59 y wrappers gobernados de especialistas en main.
Los porcentajes del README y las etiquetas históricas de feature no certifican madurez ni despliegue productivo. El estado productivo requiere evidencia del ambiente, release y validación.

## Conclusión

La v4 conecta lo que venimos construyendo en una plataforma gobernada: arquitectura, decisiones, ciclo de vida y valor.
ATLAS puede ser el cockpit de gobierno y evidencia, consumidor de patrones de DevPattern.
No debe asumir que ya es el Master empresarial, un gateway de seguridad o un autorizador financiero.
La prioridad es convertir demanda y AgentOps en contratos, decisiones y evidencia correlacionados; después incorporar enforcement y economía transaccional.

## Distribución de responsabilidad entre repositorios

| Repositorio | Fuente de verdad | Resultado |
|---|---|---|
| DevPattern | Patrones neutrales, invariantes y aceptación | Composición de plataforma, PROXI, contratos, gates y seguridad por salto |
| portafoliodatagob | Narrativa de gobierno, requisitos y evidencia del producto | Cockpit, catálogo, comités, decisiones, AgentOps y backlog ejecutable |

El deck es la referencia conceptual; no reemplaza specs, código ni evidencia.
[Composición reusable en DevPattern](https://github.com/JuliusCordova/DevPattern/blob/main/patterns/pattern-packs/governed-agentic-platform.md).

## Evidencia existente y brechas

| Plano v4 | Base observada en el repositorio | Complemento propuesto |
|---|---|---|
| Experiencia | Intake, cockpit por roles y flujo de comité descritos en README | Mostrar contrato, gate, aprobación y procedencia por caso |
| Ejecución | Orquestador y especialistas ADK descritos; wrappers determinísticos inspeccionados | Registro de capacidades, clasificación P1–P4; Master mesh solo ante dominios independientes |
| Conocimiento/acción | Evaluaciones de readiness, arquitectura y políticas en wrappers | Vincular fuentes, clasificación, propósito y scopes; routing por evidencia |
| Gobierno IA | SPEC-059 define ownership, autonomía y control plane Firestore | Contrato versionado, tier de riesgo, decisiones y recertificación |
| Seguridad | Roles/identidad descritos; validaciones gobernadas | Evidenciar enforcement por salto, audiencias, delegación, egress y revocación |
| AgentOps/confianza | F59 documenta callbacks ADK, tokens y correlación run/trace | Decisión PROXI, resultado aceptado, costos confiables y calidad de routing |
| Factory/ciclo de vida | Runbooks, smoke y gate de promoción descritos | Enlazar G0–G5 con versiones, criterios y responsables |

La presencia de documentación o tests no demuestra que un control opere en producción.
Los wrappers revisados normalizan project_type y ejecutan evaluación; no constituyen por sí solos PROXI completo.
F59 registra telemetría best-effort: su fallo no debe romper Intake; esa regla no autoriza fail-open de seguridad o gasto.

## Qué aporta específicamente la v4

- Tres entradas: brownfield, industrialización y greenfield; intake debe recomendar el punto de partida por evidencia.
- Siete planos lógicos; no siete servicios obligatorios.
- PROXI como decisión transversal: identidad/contrato, política, capacidad, conocimiento, modelo, tool/HITL y assurance.
- P1 dominio, P2 especialista, P3 herramienta, P4 consolidar/retirar para integrar inventario.
- Agent Contract Lite → completo → aplicado en runtime.
- COE federado con Governance, Platform y Factory; dominios conservan ownership del valor.
- Dos North Stars: lead time hasta producción gobernada y costo por resultado exitoso/confiable.
- Crédito agéntico normalizado en dinero, preservando tokens crudos.
- Transferencia aceptada mediante despliegue, rollback, lectura de monitor y kill switch ejecutados por el receptor.

## Ajustes y tensiones que hay que resolver

1. **Tres ejes independientes.** N0–N4 es madurez organizacional; A0–A4 es autonomía por acción; FAST DEMO/MVP/PRODUCT es evidencia de entrega. No convertirlos por una tabla automática.
2. **Fast track depende de riesgo.** A0–A1 no basta si hay datos sensibles, impacto regulatorio, acceso transversal o patrón no aprobado.
3. **Autoridad de producción.** La v4 combina RACI de alto riesgo con aprobación operativa y tablas comerciales. Proponer un accountable por decisión: COE delegado para bajo riesgo; Operativo para ruta controlada; Estratégico/Riesgo para excepciones materiales. Ratificar por cliente.
4. **Foundation MVP vs producto enterprise.** La descripción comercial no sustituye criterios G4: una etiqueta MVP no prueba producción segura.
5. **Entrada única es experiencia, no concentración de privilegios.** Preservar autorización en cada dominio; OBO depende del soporte real del destino y no es universal.
6. **Monitorear sin modificar agentes tiene límites.** Trazas del Master ven llamadas; tokens, acciones internas y calidad requieren instrumentación o telemetría del proveedor.
7. **Tokens, créditos y dinero.** El crédito interno es unidad presupuestal; no equivale automáticamente a token LLM, wallet, moneda negociable o pago MPP.
8. **Métrica de valor.** No equiparar respuesta HTTP exitosa con resultado correcto/aceptado. Separar outcomes y conciliación financiera.
9. **Fuentes del deck.** Validar cifras de mercado, disponibilidad de servicios y versiones de estándares por separado antes de reutilizarlas como afirmaciones externas.

## Gobierno de datos → readiness → gobierno IA

La base de datos aporta dueño, calidad, clasificación, linaje, finalidad y permisos.
Readiness determina si esos activos sirven al caso de uso.
Gobierno IA determina conducta, autonomía, herramientas, modelos, aprobaciones y responsabilidad.
Las tres capacidades se alimentan durante todo el ciclo; no son aprobaciones independientes que se olvidan después del intake.

## Modelo de decisiones propuesto

| Instancia | Decide | Evidencia |
|---|---|---|
| Estratégico | Apetito, autonomía máxima, inversión y excepciones materiales | Portafolio, exposición y valor realizado |
| Operativo | Tier, prioridad, ruta controlada y presupuesto delegado | Ficha, contrato, evals y costo |
| COE | Patrones, certificación y fast track delegado | Controles preaprobados y paquete de gate |
| Dominio | Propone, construye y opera; responde por el KPI | Línea base, fuentes, outcomes y SLO |

La propuesta de gobernanza debe adaptarse a mandatos corporativos existentes.
ATLAS registra y verifica derechos de decisión; un agente recomienda, no se otorga autoridad a sí mismo.

## Gates propuestos para el producto

| Gate | Evidencia mínima | Comportamiento de ATLAS propuesto |
|---|---|---|
| G0 | Necesidad, dueño, KPI y baseline | Completar/reformular intake |
| G1 | Valor, riesgo, autonomía, datos e inventario P1–P4 | Recomendar ruta; registrar decisión autorizada |
| G2 | Contrato, arquitectura y seguridad por salto | Registrar diseño aprobado y alcance sandbox |
| G3 | Golden/adversarial según riesgo, calidad y costo | Registrar aceptación de piloto |
| G4 | Aceptación, seguridad, observabilidad, presupuesto y rollback | Paquete de promoción asociado a versiones |
| G5 | SLO, drift, incidentes, costo/resultado y recertificación | Continuar, corregir o retirar |

Criterios detallados son elaboración propuesta del esquema visual v4.
Los gates de demanda, comité y release ya existentes deben mapearse explícitamente; no renombrarlos ni reemplazarlos sin migración.
Guardar gate_id, decision_id, actor/rol, scope, artifact_version, contract_version, policy_version, evidence_refs, fecha y expiración cuando aplique.

## Backlog priorizado y criterios de aceptación

| ID | Prioridad / dependencia | Incremento | Criterio de aceptación |
|---|---|---|---|
| GOV-V4-01 | P0 | Diccionario N/A/modo, riesgo y autoridad | Datos sensibles A0 no obtienen fast track por autonomía solamente |
| GOV-V4-02 | P0; 01 | Agent Contract versionado y clasificación P1–P4 | Dueño, fuentes, scopes, modelo, autonomía y estado; contrato vencido bloquea acción protegida |
| GOV-V4-03 | P0; 01–02 | Derechos de decisión + paquetes G0–G5 | Decisión autorizada ligada a versión/evidencia; cambio invalida aprobación relevante |
| GOV-V4-04 | P1; 02–03 | PROXI en sombra | Registra recomendación y diferencia con ejecución; no se presenta como enforcement |
| GOV-V4-05 | P1; F59 + 03 | Outcomes y costo por resultado | Denominador solo resultados aceptados; sin fuente muestra not_available |
| GOV-V4-06 | P1; 02–04 | Enforcement acotado por salto | Modelo no eleva scopes/autonomía; autorización fallida bloquea; kill switch verificable |
| GOV-V4-07 | P2; 05–06 | Presupuesto y showback | Conserva billed/attributed/unattributed; costo estimado etiquetado; sin doble conteo |
| GOV-V4-08 | P2; 06–07 + ADR ledger | Sandbox de pagos MPP | Reservas atómicas, idempotencia y conciliación; 2 compras de 6 con saldo 10 autorizan máximo una |

No se fija duración sin dimensionar código, migraciones y evidencias.
Primer vertical slice sugerido: Intake existente → contrato Lite de un agente → G1 con autoridad → ejecución correlacionada → outcome aceptado → evidencia para comité.
Empezar en preview aislado con datos sintéticos; fondos reales fuera de ese incremento.

## Preservar contratos AgentOps V1

SPEC-059 separa Control Plane Firestore y Observability Plane BigQuery.
Conservar IDs agent_system_id, agent_id, deployment_id, run_id y trace_id.
Agregar decisiones y outcomes mediante extensión versionada/backward-compatible definida en una spec futura; no reescribir el contrato V1 silenciosamente.
BigQuery analiza; no autoriza transacciones financieras.
La autoridad presupuestal requiere almacenamiento transaccional y un ADR antes de implementación.

Costo por resultado = costo total en ventana y base explícitas / outcomes aceptados dentro de política.
Incluir fallos y revisión humana en el numerador; si no hay outcomes aceptados, mostrar gasto y unidad no disponible.
Separar billed, attributed, unattributed, estimado, reservado y pagado; conciliarlos evitando duplicación.

## Relación con MPP y oferta

[Economía agéntica / PROXI / MPP](agentic-economics-mpp-proxi.md) conserva el detalle de pagos y fuentes.
MPP complementa interoperabilidad económica cuando un proveedor lo soporta; no es prerrequisito para el catálogo, comités, AgentOps o showback.
Oferta v4: Readiness, Explore/Assessment, Foundation, Factory/COE y Managed AgentOps.
ATLAS puede producir evidencia para esos servicios, pero las bandas, tarifas y condiciones son decisiones comerciales independientes; no activar chargeback ni facturación al documentarlas.

## Trazabilidad al PDF

| Tema | Páginas |
|---|---|
| Entradas y principios | 4, 11 |
| Madurez y siete planos | 12–13 |
| Master/PROXI y siete decisiones | 15–18 |
| P1–P4 y conocimiento | 19–20 |
| Autonomía, seguridad y contrato | 22–24 |
| COE, RACI y comités | 25–29 |
| Factory y promoción | 31–35 |
| North Stars y crédito agéntico | 39–42 |
| Oferta, artefactos y pendientes internos | 50–61 |

Revisión de código limitada a wrappers gobernados; no se ejecutaron pruebas de producto ni validación de ambiente porque este cambio es documental.
