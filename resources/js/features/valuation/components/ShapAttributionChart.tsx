import { formatFeatureName } from "@/lib/format";
import {
    chartFont,
    ensureChartsRegistered,
    getChartPalette,
    useIsDarkMode,
    zoomPluginOptions,
} from "@/lib/chartTheme";
import { Chart as ChartJS, type ChartData, type ChartOptions } from "chart.js";
import { RotateCcw } from "lucide-react";
import { useMemo, useRef } from "react";
import { Bar } from "react-chartjs-2";

ensureChartsRegistered();

export type ShapEntry = {
    feature: string;
    value: number;
};

type Props = {
    entries: ShapEntry[];
};

export default function ShapAttributionChart({ entries }: Props) {
    const chartRef = useRef<ChartJS<"bar">>(null);
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const features = useMemo(
        () => entries.map((e) => formatFeatureName(e.feature)),
        [entries],
    );
    const values = useMemo(() => entries.map((e) => e.value), [entries]);
    const colors = useMemo(
        () =>
            values.map((v) => (v >= 0 ? palette.positive : palette.negative)),
        [values, palette],
    );

    const xBounds = useMemo(() => {
        const minVal = Math.min(0, ...values);
        const maxVal = Math.max(0, ...values);
        const pad = 0.12;
        return {
            min: minVal < 0 ? minVal * (1 + pad) : 0,
            max: maxVal <= 0 ? 0.001 : maxVal * (1 + pad),
        };
    }, [values]);

    const data: ChartData<"bar"> = useMemo(
        () => ({
            labels: features,
            datasets: [
                {
                    label: "SHAP value",
                    data: values,
                    backgroundColor: colors.map((c) => `${c}cc`),
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 22,
                },
            ],
        }),
        [features, values, colors],
    );

    const options: ChartOptions<"bar"> = useMemo(
        () => ({
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500,
                easing: "easeOutQuart",
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) =>
                            `SHAP: ${Number(ctx.parsed.x).toFixed(3)}`,
                    },
                },
                datalabels: {
                    anchor: "end",
                    align: "end",
                    offset: 6,
                    color: palette.textMuted,
                    font: chartFont("bold", 11),
                    formatter: (value: number) => Number(value).toFixed(3),
                },
                zoom: zoomPluginOptions("xy"),
            },
            scales: {
                x: {
                    min: xBounds.min,
                    max: xBounds.max,
                    grid: {
                        color: palette.grid,
                    },
                    border: {
                        display: false,
                    },
                    ticks: {
                        color: palette.textMuted,
                        font: chartFont(),
                        callback: (value) => Number(value).toFixed(1),
                    },
                    title: {
                        display: true,
                        text: "SHAP Value",
                        color: palette.textMuted,
                        font: chartFont("bold"),
                    },
                },
                y: {
                    grid: {
                        display: false,
                    },
                    border: {
                        display: false,
                    },
                    ticks: {
                        color: palette.text,
                        font: chartFont(),
                    },
                },
            },
        }),
        [palette, values, xBounds],
    );

    const resetZoom = () => {
        chartRef.current?.resetZoom();
    };

    const chartHeight = Math.max(300, entries.length * 44 + 48);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                    Scroll to zoom · Shift + drag to pan · Green = positive
                    impact
                </span>
                <button
                    type="button"
                    onClick={resetZoom}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset zoom
                </button>
            </div>
            <div style={{ height: chartHeight }}>
                <Bar ref={chartRef} data={data} options={options} />
            </div>
        </div>
    );
}
