# Task List: Unified Finance and Multi-Property Workspace

## Task 1: Normalize finance ledger and invoice payments
- [x] Add failing tests for partial invoice balances, wallet attribution, and duplicate prevention.
- [x] Include payments in the normalized finance ledger and exclude legacy invoice auto-posts.
- [x] Pass focused finance tests.

## Task 2: Record invoice payments safely
- [x] Add an additive Supabase migration for wallet-linked payment validation and atomic payment recording.
- [x] Update the payment service/API to derive property from invoice and reject overpayment.
- [x] Update payment UI to accept partial amount and wallet and show remaining balance.
- [x] Verify backend and frontend builds/tests.

## Task 3: Keep income and expenses in one workflow
- [x] Ensure new expenses write to the same transaction ledger as manual income.
- [x] Keep legacy expenses visible without losing their data.
- [x] Verify dashboard totals use the same ledger as Finance.

## Task 4: Add explicit multi-property workspace selection
- [x] Add an additive membership migration and property-scoped RLS access helper/policies.
- [x] Expose only authorized properties in the workspace selector.
- [x] Reuse selected property for owner dashboard and Finance reads.
- [x] Verify staff remain restricted to assigned properties.

## Checkpoint: Complete
- [x] `npm run test:finance` passes.
- [x] `npm run build` passes.
- [x] Browser smoke check covers the mobile Finance navigation, transaction form, theme toggle, and horizontal overflow; invoice payment rules are covered by focused tests.
- [x] Confirm no migration was applied to the live Supabase project.
