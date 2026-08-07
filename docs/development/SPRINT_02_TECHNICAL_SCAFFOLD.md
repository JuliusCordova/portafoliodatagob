# Sprint 02 · Technical Scaffold

## Objetivo

Crear el primer scaffold técnico de ATLAS DataGob después de aprobar la base spec-first.

## Alcance

- Backend Python con capas API, domain, services y agents.
- Intake Agent preparado para Gemini ADK, con fallback local testeable.
- Clasificador inicial para ingeniería de datos, gobierno de datos, machine learning, agentes IA e híbridas.
- Motor de scoring ponderado.
- RAG liviano local para validar casos similares contra datos sintéticos.
- Datos sintéticos iniciales de dominios y proyectos existentes.
- Frontend Figma-first con shell visual inicial.
- Makefile y pruebas unitarias.

## Pruebas locales

```bash
make test
make lint-local
```

## Definition of Done

- Las pruebas unitarias locales pasan.
- El código no requiere conexión externa para probar la lógica base.
- Las dependencias de ADK y FastAPI quedan declaradas.
- La rama se entrega vía PR antes de despliegue.

## Próximo sprint

Sprint 03 profundiza modelo canónico, persistencia local, contratos API y datos sintéticos ampliados.
