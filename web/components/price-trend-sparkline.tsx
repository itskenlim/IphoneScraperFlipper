"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatPhp } from "@/lib/format";
import type { MarketTrendPoint } from "@/lib/marketPulseTypes";

export function PriceTrendSparkline({ points }: { points: MarketTrendPoint[] }) {
  if (points.length < 3) {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 text-center text-xs text-muted-foreground">
        Not enough daily prices yet for a trend line.
      </div>
    );
  }

  return (
    <div className="h-28 w-full sm:h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGuideFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.28} />
              <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tickFormatter={(v) => {
              const d = new Date(String(v));
              return Number.isNaN(d.getTime())
                ? ""
                : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            }}
            minTickGap={28}
            stroke="rgb(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={56}
            domain={["dataMin - 500", "dataMax + 500"]}
            tickFormatter={(v) => formatPhp(Number(v)).replace("₱", "")}
            stroke="rgb(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgb(var(--card))",
              border: "1px solid rgb(var(--border))",
              borderRadius: 12,
              fontSize: 12
            }}
            labelFormatter={(v) => {
              const d = new Date(String(v));
              return Number.isNaN(d.getTime())
                ? String(v)
                : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            }}
            formatter={(value, _name, item) => {
              const n = Number((item?.payload as MarketTrendPoint | undefined)?.n || 0);
              return [`${formatPhp(Number(value))} · ${n} listing${n === 1 ? "" : "s"}`, "Typical"];
            }}
          />
          <Area
            type="monotone"
            dataKey="median"
            stroke="rgb(var(--primary))"
            strokeWidth={2}
            fill="url(#priceGuideFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
