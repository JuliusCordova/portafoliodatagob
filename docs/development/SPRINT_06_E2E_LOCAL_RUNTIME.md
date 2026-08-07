# Sprint 06 · E2E Local Runtime

## Objective

Connect the functional backend and frontend so ATLAS DataGob can be tested locally end-to-end.

## Scope

- Enable CORS for local frontend-to-backend calls.
- Add `make dev-api` to run FastAPI locally.
- Add `make dev-web` to run Next.js with the API base URL.
- Add a smoke test for policy and architecture validation.
- Fix similar project lookup to use the existing synthetic dataset.
- Add frontend `.env.example`.

## Local execution

### 1. Install API dependencies

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 2. Validate backend contracts

```bash
make test
make lint-local
```

### 3. Start backend

```bash
make dev-api
```

Expected API:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

### 4. Start frontend

Open another terminal:

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Or from repository root:

```bash
make dev-web
```

Expected UI:

```text
http://localhost:3000
```

## E2E validation flow

1. Open frontend.
2. Confirm mode starts as demo if the backend is not running.
3. Start backend.
4. Click `Validar requerimiento`.
5. Confirm mode changes to API connected.
6. Confirm classification, architecture pattern, policy gaps, FinOps gaps and Operative Committee route are rendered.

## Definition of done

- API unit tests pass.
- Policy architecture smoke test passes.
- Python sources compile.
- Frontend has API base URL configuration.
- Backend supports local CORS.
- The UI can call `POST /intake/policy-architecture-validate` from localhost.
