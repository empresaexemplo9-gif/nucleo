"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOrg } from "./org-context";

const axis = { fontSize: 11, fill: "var(--muted)" };

function Tip({ active, payload, label, money, unit }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; money?: boolean; unit?: string }) {
  const { fmt } = useOrg();
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  const color = (p.payload.color as string) ?? "var(--brand)";
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold capitalize text-fg">{label ?? String(p.payload.name)}</p>
      <p className="flex items-center gap-1.5 text-fg-2">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {money ? fmt(p.value) : `${p.value}${unit ? " " + unit : ""}`}
      </p>
      {p.payload.count != null && money && <p className="mt-0.5 text-muted">{String(p.payload.count)} fechado(s)</p>}
    </div>
  );
}

/** Área com gradiente (ex.: receita por mês). */
export function TrendChart({ data, height = 260 }: { data: { name: string; value: number; count?: number }[]; height?: number }) {
  const { fmt } = useOrg();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={76} tickFormatter={(v) => fmt(v, true)} />
        <Tooltip cursor={{ stroke: "var(--brand)", strokeOpacity: 0.3, strokeDasharray: "4 4" }} content={<Tip money />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--brand)"
          strokeWidth={2.5}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: "var(--surface)", stroke: "var(--brand)", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "var(--brand)", stroke: "var(--surface)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Barras verticais de série única. */
export function ColumnChart({ data, money = true, height = 240 }: { data: { name: string; value: number; count?: number }[]; money?: boolean; height?: number }) {
  const { fmt } = useOrg();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={76} tickFormatter={(v) => (money ? fmt(v, true) : String(v))} />
        <Tooltip cursor={{ fill: "var(--surface-2)", radius: 6 }} content={<Tip money={money} />} />
        <Bar dataKey="value" fill="url(#colFill)" radius={[6, 6, 2, 2]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontais com cor por item. */
export function HBarChart({ data, money = true, unit }: { data: { name: string; value: number; color?: string; count?: number }[]; money?: boolean; unit?: string }) {
  const { fmt } = useOrg();
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 76, bottom: 0, left: 0 }} barCategoryGap={8}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ ...axis, fill: "var(--fg-2)" }} axisLine={false} tickLine={false} width={112} />
        <Tooltip cursor={{ fill: "var(--surface-2)", radius: 6 }} content={<Tip money={money} unit={unit} />} />
        <Bar
          dataKey="value"
          radius={[2, 6, 6, 2]}
          maxBarSize={22}
          background={{ fill: "var(--surface-2)", radius: 6 }}
          label={{ position: "right", fontSize: 11, fill: "var(--muted)", formatter: (v: unknown) => (money ? fmt(Number(v), true) : String(v)) }}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? "var(--brand)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Anel de progresso (ex.: meta). */
export function Ring({ value, size = 132, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
