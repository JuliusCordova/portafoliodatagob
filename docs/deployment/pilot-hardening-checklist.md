# Pilot hardening checklist

This checklist defines the minimum controls before an ATLAS DataGob Cloud Run pilot is shown to real users.

## Identity and authorization

- [ ] API deployed with `ATLAS_AUTH_MODE=header` for controlled pilot.
- [ ] Web deployed with `ATLAS_WEB_IDENTITY_MODE=static` for demo pilot or `passthrough` for gateway/IAP integration.
- [ ] `/api/session` displays the expected user and roles.
- [ ] Authenticated smoke passes.
- [ ] Negative authorization check blocks `viewer` from mutating operations.

## Access exposure

- [ ] Public unauthenticated access is intentional and documented, or Cloud Run access is restricted.
- [ ] CORS is limited to the Web Cloud Run URL and known local development origins.
- [ ] Service accounts are purpose-specific for API and Web.
- [ ] API service account has only required Firestore permissions.

## Data and demo safety

- [ ] Demo reset remains disabled in smoke by default.
- [ ] Firestore collection name is environment-specific.
- [ ] Demo seed does not contain sensitive or client-identifiable data.
- [ ] Runtime data can be reset or archived after demo.

## Operations

- [ ] Baseline smoke passes.
- [ ] Authenticated smoke passes.
- [ ] Cloud Run service URLs are recorded.
- [ ] Revision IDs are recorded.
- [ ] Environment variables are captured in the smoke record.
- [ ] Rollback plan is known: redeploy previous revision or switch traffic.

## Known non-goals for this stage

- Login UI.
- JWT/OIDC verification inside the app.
- User administration.
- Fine-grained row-level security.
- Production-grade audit export.

These items are candidates for later enterprise hardening sprints.
