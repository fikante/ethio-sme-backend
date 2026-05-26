---
name: project-applymodal-lender-step
description: ApplyModal now has 5 steps (0–4): Step 0 is "Choose Your Lender" before Personal/Business/Psych/Submit
type: project
---

As of 2026-05-26, `ApplyModal.tsx` has a new Step 0 "Choose Your Lender" inserted before the original steps 1–4.

**Step sequence:** 0=Lender → 1=Personal → 2=Business → 3=Psych → 4=Submit → success

**Key details:**
- `STEP_LABELS = ['Lender', 'Personal', 'Business', 'Psych', 'Submit']` — 5 labels
- `FormState.loanProviderId: number | null` carries the selection
- `LoanProviderOption` interface exported from `ApplyModal.tsx`, imported into `LoanApplication.tsx`
- Providers passed via `loanProviders` Inertia prop (populated by `LoanApplicationWebController::show` from Eloquent)
- `loan_provider_id` appended to FormData in `handleFinalSubmit`
- `validateStep0` blocks progression if no provider selected
- Provider cards show initials avatar if no `logo_url`; selected card gets ring-1 border highlight
- Progress bar uses `(numericStep / 4) * 100%` (4 intervals across 5 steps)
- StepIndicator circles are slightly smaller (h-8 w-8) to fit 5 steps without crowding

**How to apply:** If adding another step to ApplyModal, update STEP_LABELS array and adjust the progress bar denominator accordingly.
