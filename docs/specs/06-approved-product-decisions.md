# 06 · Decisiones aprobadas de producto

## Estado

Aprobado para guiar el Sprint 01 antes de iniciar desarrollo.

## Producto

El producto se denomina **ATLAS DataGob**.

ATLAS DataGob es una plataforma agéntica para gestionar el ciclo completo de demanda de proyectos de datos: solicitud, triage, clasificación, caso de uso, scoring, decisión de comités, seguimiento, MVP y pase a producción.

## Posicionamiento

El producto debe ser **neutral y client-agnostic**. Debe poder usarse tanto en un contexto corporativo como en el portafolio personal del autor.

No debe depender visual ni funcionalmente de una marca de cliente o empresa específica.

## Identidad visual aprobada

- Marca del producto: **ATLAS**.
- Logo conceptual: letra A geométrica integrada con brújula / navegación / dirección.
- Fondo preferido: blanco, limpio, ejecutivo, similar a demos previas tipo PrimaDemo.
- Paleta base: blanco, azul navy / charcoal, azul acento y uso controlado de verde como señal positiva.
- Estilo: premium, ejecutivo, sobrio, moderno, reusable.
- Uso: presentaciones, prototipo, frontend y documentación.

## Decisión de diseño

El desarrollo debe seguir enfoque **Figma-first**.

Antes de construir pantallas en código debe existir:

1. Pantalla diseñada en Figma.
2. Propósito funcional de la pantalla.
3. Principio de usabilidad aplicado.
4. Criterios de aceptación de la pantalla.
5. Validación de consistencia con el sistema visual ATLAS.

## Decisión tecnológica

- Agentes: **Gemini ADK**.
- Plataforma cloud: **Google Cloud**.
- Despliegue: Cloud Run.
- Persistencia operacional: Firestore.
- Analítica de portafolio: BigQuery.
- Evidencias y artefactos: Cloud Storage.
- Eventos del ciclo de vida: Pub/Sub.
- Seguridad: IAM, Secret Manager, logging y auditoría.
- Infraestructura: Terraform.
- CI/CD: GitHub Actions.

## Principio de control humano

Los agentes recomiendan, estructuran, clasifican, explican y preparan evidencia.

Los agentes **no toman decisiones finales**.

Las decisiones finales corresponden a los usuarios responsables, comité operativo o comité estratégico según el flujo.

## Regla de avance

No se debe iniciar desarrollo funcional hasta que estén aprobadas las specs de:

- Requerimientos funcionales.
- Requerimientos no funcionales.
- Arquitectura MVP.
- Agentes Gemini ADK.
- Modelo de datos.
- Criterios de aceptación.
- Prototipo Figma.
