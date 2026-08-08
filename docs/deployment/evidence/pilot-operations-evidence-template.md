# ATLAS DataGob · Pilot Operations Evidence Template

Use this template to capture controlled pilot evidence after Cloud Run deployment and smoke validation.

## 1. Deployment summary

| Field | Value |
| --- | --- |
| Pilot date | TBD |
| Operator | TBD |
| Approver | TBD |
| GCP project | TBD |
| Region | TBD |
| API service | TBD |
| API URL | TBD |
| API revision | TBD |
| Web service | TBD |
| Web URL | TBD |
| Web revision | TBD |
| Release commit | TBD |

## 2. Runtime configuration

| Field | Value |
| --- | --- |
| Persistence adapter | `firestore` / `local_json` |
| Firestore collection | TBD |
| API auth mode | `disabled` / `header` |
| Web identity mode | `disabled` / `static` / `passthrough` |
| Allow unauthenticated | `true` / `false` |
| CORS origins | TBD |
| CORS regex | TBD |

## 3. Smoke results

| Smoke | Expected result | Actual result | Evidence |
| --- | --- | --- | --- |
| API `/health` | HTTP 200 | TBD | Standard smoke output |
| API `/demo/cases` | HTTP 200, count >= 10 | TBD | Standard smoke output |
| Web root | HTTP 200 | TBD | Standard smoke output |
| Web `/api/session` | HTTP 200 | TBD | Standard smoke output |
| Web `/api/demo/cases` | HTTP 200, count >= 10 | TBD | Standard smoke output |
| API `/auth/permissions` with valid roles | HTTP 200 | TBD | Authenticated smoke output |
| API `/demo/reset` with viewer | HTTP 403 when auth enforced | TBD | Authenticated smoke output |
| Optional authenticated demo reset | HTTP 200 only when enabled | TBD | Authenticated smoke output |

## 4. Pilot acceptance criteria

| Criterion | Status | Notes |
| --- | --- | --- |
| API service reachable | Pending |  |
| Web service reachable | Pending |  |
| Web proxy reaches API | Pending |  |
| Session is visible in UI | Pending |  |
| Identity propagation validated | Pending |  |
| Positive auth path validated | Pending |  |
| Negative auth path validated | Pending |  |
| Firestore persistence validated | Pending |  |
| Rollback revision captured | Pending |  |
| Pilot owner approval captured | Pending |  |

## 5. Release decision

Decision: `pending`  
Approver: `pending`  
Date: `pending`  
Notes: `pending`

## 6. Attachments / links

- Standard smoke output: TBD
- Authenticated smoke output: TBD
- Cloud Run API revision: TBD
- Cloud Run Web revision: TBD
- Firestore evidence: TBD
- UI screenshot: TBD
