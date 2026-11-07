"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOrg } from "./org-context";

const axis = { fontSize: 11, fill: "var(--muted)" };

function Tip({ active, payload, label, money }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; money?: boolean }) {
  const { fmt } = useOrg();
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label ?? String(p.payload.name)}</p>
      <p className="text-muted">{money ? fmt(p.value) : p.value}{p.payload.count != null && money ? ` · ${p.payload.count} negócio(s)` : ""}</p>
    </div>
  );
}

/** Barras verticais de série única (ex.: receita por mês). */
export function ColumnChart({ data, money = true, height = 240 }: { data: { name: string; value: number; count?: number }[]; money?: boolean; height?: number }) {
  const { fmt } = useOrg();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={76} tickFormatter={(v) => (money ? fmt(v, true) : String(v))} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip money={money} />} />
        <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontais com cor por item (ex.: valor por etapa). */
export function HBarChart({ data, money = true }: { data: { name: string; value: number; color?: string; count?: number }[]; money?: boolean }) {
  const { fmt } = useOrg();
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={110} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip money={money} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: "right", fontSize: 11, fill: "var(--muted)", formatter: (v: unknown) => (money ? fmt(Number(v), true) : String(v)) }}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? "var(--brand)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
