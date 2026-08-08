# ATLAS DataGob Web

Frontend MVP for ATLAS DataGob.

## Current product experience

The web app exposes three role-based views:

- **Intake negocio:** conversational intake for the Data Owner / business user.
- **Comité operativo:** filtered demand grid, editable side panel, validation checklist and score recalculation.
- **Tablero ejecutivo:** portfolio KPIs, Top cases, score, priority and financial signals.

## Local development

Run the API from the repository root:

```bash
make dev-api
```

Run the web app:

```bash
cd apps/web
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

The web app calls internal Next.js proxy routes, which in turn call the local API at:

```text
http://localhost:8000
```

Override it only when needed:

```bash
ATLAS_INTERNAL_API_BASE=http://localhost:8000 npm run dev -- -H 0.0.0.0 -p 3000
```

## Verification before PR

Run:

```bash
cd apps/web
npm install
npm run typecheck
npm run build
```

Or run the combined verification command:

```bash
npm run verify
```

## CI

The `Web build` workflow validates the frontend on every pull request to `main`:

- dependency installation
- TypeScript typecheck
- Next.js production build
