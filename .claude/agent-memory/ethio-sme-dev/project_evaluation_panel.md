---
name: project-evaluation-panel
description: EvaluationPanel slide-over architecture — how the lender reviews and decides on evaluated applications in-place
metadata:
  type: project
---

EvaluationPanel (`resources/js/Components/Lender/EvaluationPanel.tsx`) is the primary lender interaction surface for Task 4. It replaces navigation to RiskAndForecast page with an in-place slide-over.

**Why:** The RiskAndForecast page navigation broke the pipeline workflow. Slide-over keeps context and allows decisions without page reloads.

**How to apply:**
- Panel opens when "Review →" (evaluated) or "View Results" (approved/rejected) are clicked in ApplicationsPipeline — previously these were `<Link>` to `risk.forecast.show`, now they are `<button>` calling `setSelectedApplicationId(id)`.
- Data is fetched via a native `fetch()` call to `GET /lender/applications/{application}/detail` (route: `lender.application.detail`) which returns JSON — NOT an Inertia response.
- The fetch uses the XSRF-TOKEN cookie for CSRF, decoded from `document.cookie`.
- Decisions use `router.post()` from `@inertiajs/react` to `decisioning.decide` — this triggers the Inertia protocol and allows `onSuccess`/`onError` callbacks.
- After a decision, `onDecision()` calls `router.reload({ only: ['applications'] })` to refresh just the table data without a full page navigation.
- Toast auto-dismisses after 4000ms using `useEffect` with `setTimeout`.
- Panel closes on Escape key via `document.addEventListener('keydown', ...)`.
- Confirmation modals are z-[60], panel is z-50, toast is z-[70] — stack order is intentional.
- `ApplicationDetailController::show()` computes `data_coverage_days` using `SupabaseHeartbeatSchema` helpers, same pattern as `ApplicationsPipelineController`.
- Psychometric scores are multiplied × 100 in the controller before JSON response (stored 0–1, displayed as percentages).
- `DecisioningController::decide()` now returns JSON when `$request->wantsJson()`, otherwise still redirects — backward compatible with any direct form POST.
- `LoanDecisionData` gained two nullable fields: `officerNotes` and `rejectionReasonCode`; `SubmitLoanDecisionAction` persists them to `officer_notes` and `rejection_reason_code` columns on `loan_applications`.
