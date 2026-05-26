---
name: project-psychometric-score-scale
description: psychometric_assessments.composite_score is stored as 0–1 decimal, must multiply by 100 before passing to UI
metadata:
  type: project
---

`psychometric_assessments.composite_score` is stored as a 0–1 decimal (e.g., `0.6946`), not 0–100.

**Why:** The Python AI service returns composite scores normalised to the 0–1 range, and the DB persists them as-is with a `decimal:4` cast.

**How to apply:** Whenever passing `composite_score` to the frontend, multiply by 100 and round:
```php
$psychoScore = $psycho?->composite_score !== null
    ? round((float) $psycho->composite_score * 100, 1)
    : null;
```
This fix lives in `SmeValuationController::buildSmeOwnerView()`. Any other controller or API endpoint that exposes this field to the UI must apply the same conversion.
