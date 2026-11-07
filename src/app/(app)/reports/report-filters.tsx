"use client";
import { Select } from "@/components/ui";
import { useParamSetter } from "@/components/list-toolbar";

export function ReportFilters({ period, periods, pipeline, pipelines }: { period: string; periods: Record<string, string>; pipeline: string; pipelines: { id: string; name: string }[] }) {
  const set = useParamSetter();
  return (
    <>
      <Select value={period} onChange={(e) => set("period", e.target.value)} className="w-auto">
        {Object.entries(periods).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>
      {pipelines.length > 1 && (
        <Select value={pipeline} onChange={(e) => set("pipeline", e.target.value)} className="w-auto">
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      )}
    </>
  );
}
