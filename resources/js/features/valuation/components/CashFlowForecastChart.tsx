import { formatEtb } from "@/lib/format";
import {
    chartFont,
    dayAxisTick,
    ensureChartsRegistered,
    getChartPalette,
    useIsDarkMode,
    zoomPluginOptions,
} from "@/lib/chartTheme";
import { Chart as ChartJS, type ChartData, type ChartOptions } from "chart.js";
import { RotateCcw } from "lucide-react";
import { useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";

ensureChartsRegistered();

type Props = {
    p10: Array<string | number>;
    p50: Array<string | number>;
    p90: Array<string | number>;
    height?: number;
};

function buildGradient(
    ctx: CanvasRenderingContext2D,
    area: { top: number; bottom: number },
    color: string,
): CanvasGradient | string {
    if (!area) {
        return color;
    }
    const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    gradient.addColorStop(0, `${color}33`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
}

export default function CashFlowForecastChart({
    p10,
    p50,
    p90,
    height = 380,
}: Props) {
    const chartRef = useRef<ChartJS<"line">>(null);
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const labels = useMemo(
        () => Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        [],
    );

    const data: ChartData<"line"> = useMemo(
        () => ({
            labels,
            datasets: [
                {
                    label: "P10",
                    data: p10.map(Number),
                    borderColor: palette.p10,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) {
                            return `${palette.p10}22`;
                        }
                        return buildGradient(ctx, chartArea, palette.p10);
                    },
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: palette.pointFill,
                    pointBorderColor: palette.p10,
                    pointBorderWidth: 2,
                    pointHitRadius: 12,
                },
                {
                    label: "P50",
                    data: p50.map(Number),
                    borderColor: palette.p50,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) {
                            return `${palette.p50}22`;
                        }
                        return buildGradient(ctx, chartArea, palette.p50);
                    },
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: palette.pointFill,
                    pointBorderColor: palette.p50,
                    pointBorderWidth: 2,
                    pointHitRadius: 12,
                },
                {
                    label: "P90",
                    data: p90.map(Number),
                    borderColor: palette.p90,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) {
                            return `${palette.p90}22`;
                        }
                        return buildGradient(ctx, chartArea, palette.p90);
                    },
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: palette.pointFill,
                    pointBorderColor: palette.p90,
                    pointBorderWidth: 2,
                    pointHitRadius: 12,
                },
            ],
        }),
        [labels, p10, p50, p90, palette],
    );

    const options: ChartOptions<"line"> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false,
            },
            animation: {
                duration: 600,
                easing: "easeOutQuart",
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: palette.textMuted,
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: "circle",
                        font: chartFont(),
                    },
                },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: (ctx) =>
                            `${ctx.dataset.label}: ${formatEtb(ctx.parsed.y)}`,
                    },
                },
                datalabels: {
                    display: false,
                },
                zoom: zoomPluginOptions(),
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    border: {
                        color: palette.border,
                    },
                    ticks: {
                        color: palette.textMuted,
                        maxRotation: 0,
                        autoSkip: false,
                        callback: (_value, index) => dayAxisTick(index),
                        font: chartFont(),
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: "ETB",
                        color: palette.textMuted,
                        font: chartFont("bold"),
                    },
                    grid: {
                        color: palette.grid,
                    },
                    border: {
                        display: false,
                    },
                    ticks: {
                        color: palette.textMuted,
                        callback: (value) =>
                            Number(value).toLocaleString("en-US"),
                        font: chartFont(),
                    },
                },
            },
        }),
        [palette],
    );

    const resetZoom = () => {
        chartRef.current?.resetZoom();
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                    Scroll to zoom · Shift + drag to pan · Hover for values
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
            <div style={{ height }}>
                <Line ref={chartRef} data={data} options={options} />
            </div>
        </div>
    );
}
