# Brief: <Feature name>

> Copy this file to `briefs/<kebab-feature-name>.md` and fill it in. One brief
> per feature we agree on in chat. Delete the guidance blockquotes as you go.

- **Status:** draft | approved | in progress | shipped
- **Date:** YYYY-MM-DD
- **Branch:** `feature/<name>` (git flow, off `develop`)
- **Owner agent(s):** architect / frontend / backend

## Problem / goal

> What are we trying to achieve, and why now? One paragraph. Describe the
> outcome for the visitor or the owner, not the implementation.

## Scope

**In scope**
- …

**Out of scope**
- …

## Which service(s)

> Tick what this touches and note the client/server seam if it crosses it.

- [ ] `services/public` (SPA)
- [ ] `services/api` (NestJS)
- [ ] Contract change (request/response shape, new endpoint, new env var)

## The seam / contract

> If this crosses client↔server: endpoint, method, request body, success body,
> and error body. Remember the error contract is `422 { message, errors: { field: [msg] } }`.

## Design notes

> For visual work: reference the design tokens in `services/public/src/styles/base.css`
> and the `frontend-design` plugin. Link mockups or describe the intended feel.

## Acceptance criteria

- [ ] …
- [ ] Build passes for each touched service.
- [ ] (Frontend) verified with a screenshot at desktop + mobile.
- [ ] (Backend) endpoint exercised with curl; success and error paths checked.

## Open questions

- …
