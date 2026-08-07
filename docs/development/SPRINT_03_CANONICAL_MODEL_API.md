# Sprint 03 · Modelo canónico, persistencia local y contratos API

## Objetivo

Convertir las decisiones de arquitectura canónica en artefactos técnicos versionados y testeables antes de avanzar hacia persistencia cloud o despliegue.

## Alcance

- Modelo canónico de dominios, subdominios, entidades, campos y relaciones.
- Diccionario de datos sintético versionado.
- Diagrama entidad-relación en formato JSON versionado.
- Validador de consistencia entre dominios, diccionario y relaciones.
- Repositorio JSON local para demandas, útil para desarrollo y pruebas.
- Contrato OpenAPI inicial.
- Endpoints de metadata para exponer catálogo, diccionario, ER y validación.

## Principios

1. El diccionario de datos y el modelo ER son parte del producto, no documentación secundaria.
2. El modelo canónico debe ser independiente de Firestore, BigQuery o cualquier motor específico.
3. La persistencia local es temporal y sirve para validar contratos antes del despliegue cloud.
4. Todo cambio futuro de entidades debe actualizar diccionario, ER, contratos API y pruebas.

## Endpoints nuevos

```text
GET /metadata/domains
GET /metadata/data-dictionary
GET /metadata/er-model
GET /metadata/validate
```

## Pruebas

```bash
make test
make lint-local
```

## Siguiente paso

Sprint 04 debe construir el chatbot de intake con Gemini ADK sobre esta base canónica y conectarlo al clasificador, RAG liviano y contratos API.
