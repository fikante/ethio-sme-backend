---
name: project-chartjs-patterns
description: Chart.js registration pattern — ensureChartsRegistered() covers Line/Bar, Doughnut needs explicit local registration
metadata:
  type: project
---

`/resources/js/lib/chartTheme.ts` exports `ensureChartsRegistered()` which registers: CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler, zoomPlugin, DataLabels.

**Doughnut charts require additional registration** — `ArcElement` and `DoughnutController` are NOT included. Any file using `<Doughnut>` must do:
```ts
import { ArcElement, DoughnutController, Chart as ChartJS } from 'chart.js';
ChartJS.register(ArcElement, DoughnutController);
ensureChartsRegistered(); // still call this for shared components
```

**How to apply:** Any new component using `<Doughnut>` from `react-chartjs-2` must register ArcElement + DoughnutController locally before calling `ensureChartsRegistered()`.
