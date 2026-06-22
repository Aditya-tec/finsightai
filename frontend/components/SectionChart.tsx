"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CHART_COLORS,
  CHART_DISCLAIMER,
  type ChartData,
  formatBarSeriesTooltip,
  formatCroreFull,
  formatCroreAxisTick,
  isBarChartData,
  isDonutChartData,
  maxBarDatasetValue,
  pickCroreAxisUnit,
} from "@/lib/chartTypes";
import { CHART_ANIM } from "@/lib/chartTheme";

type Props = {
  data: ChartData;
};

type BarTooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  value?: number;
};

function BarChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: BarTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      className="chart-tooltip"
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {label ? <p className="chart-tooltip-title">{label}</p> : null}
      {payload.map((entry) => {
        const seriesLabel = String(entry.dataKey ?? entry.name ?? "");
        const value = Number(entry.value);
        if (!Number.isFinite(value)) return null;
        return (
          <p
            key={seriesLabel}
            className="chart-tooltip-row"
            style={{ color: entry.color ?? "#a1a1a1" }}
          >
            <span
              className="chart-tooltip-dot"
              style={{ backgroundColor: entry.color ?? CHART_COLORS[0] }}
            />
            {formatBarSeriesTooltip(seriesLabel, value, label)}
          </p>
        );
      })}
    </motion.div>
  );
}

function BarSectionChart({ data }: { data: Extract<ChartData, { type: "bar" }> }) {
  const [fy24, fy25] = data.labels;
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const rows = [
    {
      year: fy24,
      ...Object.fromEntries(data.datasets.map((ds) => [ds.label, ds.values[0]])),
    },
    {
      year: fy25,
      ...Object.fromEntries(data.datasets.map((ds) => [ds.label, ds.values[1]])),
    },
  ];

  const dualAxis = data.datasets.length >= 2;
  const leftUnit = pickCroreAxisUnit(maxBarDatasetValue(data.datasets[0].values));
  const rightUnit = dualAxis
    ? pickCroreAxisUnit(maxBarDatasetValue(data.datasets[1].values))
    : leftUnit;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={rows}
        margin={{
          top: 12,
          right: dualAxis ? 58 : 18,
          left: dualAxis ? 18 : 10,
          bottom: 8,
        }}
        barCategoryGap="18%"
        onMouseMove={(state) => {
          const label = state?.activeLabel;
          setActiveYear(typeof label === "string" ? label : null);
        }}
        onMouseLeave={() => setActiveYear(null)}
      >
        <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{
            fill: "#c7c7c7",
            fontSize: 12,
            fontWeight: activeYear ? 600 : 500,
          }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
          dy={6}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          tick={{ fill: "#9a9a9a", fontSize: 10 }}
          width={dualAxis ? 58 : 50}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCroreAxisTick(Number(v), leftUnit)}
        />
        {dualAxis ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#9a9a9a", fontSize: 10 }}
            width={58}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCroreAxisTick(Number(v), rightUnit)}
          />
        ) : null}
        <Tooltip
          content={<BarChartTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)", radius: 6 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#b0b0b0", paddingTop: 8 }}
          formatter={(value) => <span className="chart-legend-label">{value}</span>}
        />
        {data.datasets.map((ds, i) => (
          <Bar
            key={ds.label}
            yAxisId={dualAxis && i > 0 ? "right" : "left"}
            dataKey={ds.label}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={52}
            animationDuration={CHART_ANIM.barDuration}
            animationEasing={CHART_ANIM.ease}
            animationBegin={i * CHART_ANIM.barStagger}
            activeBar={{
              fill: CHART_COLORS[i % CHART_COLORS.length],
              stroke: "rgba(255,255,255,0.35)",
              strokeWidth: 1,
              radius: 4,
            }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

type DonutTooltipPayload = {
  name?: string;
  value?: number;
  payload?: { name?: string; value?: number; fill?: string };
};

function DonutChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: DonutTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name = entry.payload?.name ?? entry.name ?? "Segment";
  const value = Number(entry.payload?.value ?? entry.value);
  if (!Number.isFinite(value)) return null;

  return (
    <motion.div
      className="chart-tooltip"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="chart-tooltip-row">
        <span
          className="chart-tooltip-dot"
          style={{ backgroundColor: entry.payload?.fill ?? CHART_COLORS[0] }}
        />
        {`${name}: ${formatCroreFull(value)}`}
      </p>
    </motion.div>
  );
}

function DonutSectionChart({ data }: { data: Extract<ChartData, { type: "donut" }> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const pieData = data.segments.map((s) => ({ name: s.label, value: s.value }));
  const total = data.segments.reduce((sum, s) => sum + s.value, 0);
  const activeSegment =
    activeIndex !== null && activeIndex >= 0 && activeIndex < data.segments.length
      ? data.segments[activeIndex]
      : null;
  const centerValue = activeSegment ? activeSegment.value : total;
  const centerCaption = activeSegment ? activeSegment.label : "Total";

  return (
    <div className="donut-chart-layout">
      <div className="donut-chart-canvas">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={3}
              stroke="none"
              onMouseEnter={(_, idx) => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              animationDuration={CHART_ANIM.pieDuration}
              animationEasing={CHART_ANIM.ease}
              isAnimationActive
            >
              {pieData.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  className="donut-segment-cell"
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<DonutChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center-label" aria-hidden>
          <span className="donut-center-value">{formatCroreFull(centerValue)}</span>
          <span className="donut-center-caption">{centerCaption}</span>
        </div>
      </div>
      <motion.ul
        className="donut-legend-list"
        aria-label="Segment breakdown"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } },
        }}
      >
        {data.segments.map((seg, i) => (
          <motion.li
            key={seg.label}
            className="donut-legend-item"
            variants={{
              hidden: { opacity: 0, x: -8 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
            }}
            whileHover={{ x: 2, transition: { duration: 0.15 } }}
          >
            <span
              className="donut-legend-swatch"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="donut-legend-label">{seg.label}</span>
            <span className="donut-legend-value">{formatCroreFull(seg.value)}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export default function SectionChart({ data }: Props) {
  const chartBody = isBarChartData(data) ? (
    <BarSectionChart data={data} />
  ) : isDonutChartData(data) ? (
    <DonutSectionChart data={data} />
  ) : null;

  if (!chartBody) return null;

  return (
    <motion.div
      className={`section-chart-wrap${isDonutChartData(data) ? " section-chart-wrap-donut" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {chartBody}
      <p className="chart-disclaimer">{CHART_DISCLAIMER}</p>
    </motion.div>
  );
}
