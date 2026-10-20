# Implementation Plan: Unified Finance and Multi-Property Workspace

## Overview
Adapt the finance, invoice, and workspace patterns observed in `rapzeuzOS` to KOST's existing Supabase and local-cache architecture. Keep one Finance navigation entry, make money-in/money-out recording explicit and single-source, and feed the same verified ledger into the owner dashboard. Add property switching only for properties authorized to the signed-in user.

## Architecture Decisions
- Use an auditable ledger assembled from manual cash transactions, legacy expenses, and invoice payments; do not create a second manual invoice-revenue entry when a payment already exists.
- Persist invoice payment wallet and amount with the payment record; calculate outstanding balance from partial payments and update paid/overdue status transactionally.
- Keep existing expense rows readable for historical data. New expense inputs should use the unified cash transaction path.
- Model multi-property access explicitly with memberships and validate the selected property in both Supabase RLS and backend service routes. Preserve the existing `user_profiles.property_id` path as a migration/backward-compatibility source.
- Add only additive migrations. Do not apply migrations to the live KOST project in this task.
- Adapt observed behavior from `rapzeuzOS`; reimplement the pattern in KOST rather than copying source files.

## Task List
1. Define and test ledger rules for invoice payments, partial balances, and no duplicate income.
2. Implement atomic invoice payment recording with wallet assignment and clear partial-payment UI.
3. Route all new money-in/money-out entries through one Finance workflow and use it on the dashboard.
4. Add authorized multi-property selection for owner workspaces and scope finance/dashboard reads to the selected property.
5. Run focused tests, production build, and browser smoke checks; review changed migrations and access paths.

## Risks and Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Existing finance and dashboard changes are uncommitted | High | Build on current working tree; do not reset, stage, or commit it. |
| Invoice payments are written by a service-role backend | High | Make validation atomic in a database function, derive property from invoice, and validate wallet belongs to invoice property. |
| Owner property assignment is not represented consistently today | High | Add explicit membership rows and backfill known profile-property links; preserve the app's existing global-owner property list behavior only through explicit memberships. |
| Legacy expenses and auto-posted invoice cash entries may overlap | Medium | Keep historical data readable and add tests/filters that prevent invoice payment double counting. |

## Open Questions
- None needed to start: follow the existing app authorization model, and do not deploy the migration as part of this implementation.
