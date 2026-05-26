---
name: project-role-consolidation
description: loan_officer role was consolidated into loan_provider in migration 2026_05_24; both names still resolve via WebRoleAlias
metadata:
  type: project
---

The canonical lender role is now `loan_provider` (not `loan_officer`). Migration `2026_05_24_120000_consolidate_loan_provider_role.php` migrated all `loan_officer` and `loan-provider` Spatie rows to `loan_provider`.

**Why:** The PRD introduced multi-bank LoanProvider entities. Each bank has its own `loan_providers` table record; loan officers belong to a provider via `users.loan_provider_id`.

**How to apply:** When creating new loan officer users or writing middleware checks, use `loan_provider` as the role name. `WebRoleAlias::loanProviderRoleNames()` returns `['loan_provider', 'loan_officer', 'loan-provider']` for backward compatibility.

Related: [[project-dashboard-architecture]]
