"use client";

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
  formatChartValue,
  formatCroreAxisTick,
  isBarChartData,
  isDonutChartData,
  maxBarDatasetValue,
  pickCroreAxisUnit,
} from "@/lib/chartTypes";

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
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(0,153,255,0.25)",
        borderRadius: 8,
        fontSize: 12,
        padding: "8px 10px",
      }}
    >
      {label ? (
        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#e5e5e5" }}>{label}</p>
      ) : null}
      {payload.map((entry) => {
        const seriesLabel = String(entry.dataKey ?? entry.name ?? "");
        const value = Number(entry.value);
        if (!Number.isFinite(value)) return null;
        return (
          <p key={seriesLabel} style={{ margin: "2px 0", color: entry.color ?? "#a1a1a1" }}>
            {formatBarSeriesTooltip(seriesLabel, value)}
          </p>
        );
      })}
    </div>
  );
}

function BarSectionChart({ data }: { data: Extract<ChartData, { type: "bar" }> }) {
  const [fy24, fy25] = data.labels;
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
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={rows}
        margin={{ top: 8, right: dualAxis ? 52 : 12, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: "#a1a1a1", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          tick={{ fill: "#a1a1a1", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCroreAxisTick(Number(v), leftUnit)}
        />
        {dualAxis ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#a1a1a1", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCroreAxisTick(Number(v), rightUnit)}
          />
        ) : null}
        <Tooltip content={<BarChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1a1" }} />
        {data.datasets.map((ds, i) => (
          <Bar
            key={ds.label}
            yAxisId={dualAxis && i > 0 ? "right" : "left"}
            dataKey={ds.label}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutSectionChart({ data }: { data: Extract<ChartData, { type: "donut" }> }) {
  const pieData = data.segments.map((s) => ({ name: s.label, value: s.value }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="78%"
          paddingAngle={2}
          stroke="none"
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(0,153,255,0.25)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatChartValue(Number(value)), ""]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 11, color: "#a1a1a1", paddingLeft: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function SectionChart({ data }: Props) {
  if (isBarChartData(data)) {
    return (
      <div className="section-chart-wrap">
        <BarSectionChart data={data} />
        <p className="chart-disclaimer">{CHART_DISCLAIMER}</p>
      </div>
    );
  }
  if (isDonutChartData(data)) {
    return (
      <div className="section-chart-wrap">
        <DonutSectionChart data={data} />
        <p className="chart-disclaimer">{CHART_DISCLAIMER}</p>
      </div>
    );
  }
  return null;
}
