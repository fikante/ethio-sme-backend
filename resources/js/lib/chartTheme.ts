import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
    type ChartOptions,
} from "chart.js";
import DataLabels from "chartjs-plugin-datalabels";
import zoomPlugin from "chartjs-plugin-zoom";
import { useEffect, useState } from "react";

let chartsRegistered = false;

export function ensureChartsRegistered(): void {
    if (chartsRegistered) {
        return;
    }
    ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        Tooltip,
        Legend,
        Filler,
        zoomPlugin,
        DataLabels,
    );
    chartsRegistered = true;
}

export type ChartPalette = {
    text: string;
    textMuted: string;
    grid: string;
    border: string;
    surface: string;
    tooltipBg: string;
    tooltipBorder: string;
    pointFill: string;
    p10: string;
    p50: string;
    p90: string;
    positive: string;
    negative: string;
};

export function getChartPalette(isDark: boolean): ChartPalette {
    if (isDark) {
        return {
            text: "#fafafa",
            textMuted: "#a1a1aa",
            grid: "rgba(255, 255, 255, 0.08)",
            border: "rgba(255, 255, 255, 0.12)",
            surface: "#18181b",
            tooltipBg: "#27272a",
            tooltipBorder: "#3f3f46",
            pointFill: "#18181b",
            p10: "#f87171",
            p50: "#60a5fa",
            p90: "#4ade80",
            positive: "#4ade80",
            negative: "#f87171",
        };
    }

    return {
        text: "#18181b",
        textMuted: "#71717a",
        grid: "rgba(0, 0, 0, 0.06)",
        border: "rgba(0, 0, 0, 0.08)",
        surface: "#ffffff",
        tooltipBg: "#ffffff",
        tooltipBorder: "#e4e4e7",
        pointFill: "#ffffff",
        p10: "#dc2626",
        p50: "#2563eb",
        p90: "#16a34a",
        positive: "#16a34a",
        negative: "#dc2626",
    };
}

export function useIsDarkMode(): boolean {
    const [isDark, setIsDark] = useState(
        () =>
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark"),
    );

    useEffect(() => {
        const root = document.documentElement;
        const sync = () => setIsDark(root.classList.contains("dark"));
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(root, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

export function chartFont(
    weight: "normal" | "bold" = "normal",
    size = 12,
): { family: string; size: number; weight: "normal" | "bold" } {
    return {
        family: "'Figtree', system-ui, sans-serif",
        size,
        weight,
    };
}

export function zoomPluginOptions(
    mode: "x" | "xy" = "x",
): NonNullable<ChartOptions["plugins"]>["zoom"] {
    return {
        zoom: {
            wheel: { enabled: true, speed: 0.08 },
            pinch: { enabled: true },
            drag: {
                enabled: false,
            },
            mode,
        },
        pan: {
            enabled: true,
            mode,
            modifierKey: "shift",
        },
        limits: {
            x: { min: "original", max: "original" },
            y: { min: "original", max: "original" },
        },
    };
}

export function dayAxisTick(index: number): string {
    const day = index + 1;
    return day === 1 || (day - 1) % 3 === 0 ? `Day ${day}` : "";
}
