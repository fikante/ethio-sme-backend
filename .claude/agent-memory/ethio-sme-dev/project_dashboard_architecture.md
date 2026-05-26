---
name: project-dashboard-architecture
description: DashboardController is thin — all stats logic is in DashboardStatsService. SME owner stats now include redesigned props.
metadata:
  type: project
---

The `DashboardController` simply calls `DashboardStatsService::getForRole($user)` and passes the result as `stats`. There is no role-branching in the controller itself — it stays at ~28 lines.

`DashboardStatsService::smeOwner()` now returns both:
- Legacy keys (`business`, `heartbeatDays`, `hasAssessment`, `application` with `npv_credit_limit: null`) — needed by `SmeLatestApplicationCard`
- Redesigned keys: `latestApplication`, `psychometricAssessment`, `cashflowTrend`, `txnActivity`, `coverageDays`, `healthScore`, `shapDrivers`, `hasBusiness`

**Why:** The redesigned SME dashboard hides raw financial figures (npv_credit_limit, P10/P50/P90) from owners — only friendly labels and composite scores are shown.

**How to apply:** When adding new SME owner dashboard data, add it to `DashboardStatsService::smeOwner()` and update `SmeOwnerStats` in `resources/js/types/dashboard.ts`.
