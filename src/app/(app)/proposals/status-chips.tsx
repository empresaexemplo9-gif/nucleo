"use client";
import { FilterChip } from "@/components/ui";
import { useParamSetter } from "@/components/list-toolbar";
import { PROPOSAL_STATUS } from "@/lib/commerce";

export function StatusChips({ current, counts, map = PROPOSAL_STATUS }: { current: string; counts: Record<string, number>; map?: Record<string, { label: string; color: string }> }) {
  const set = useParamSetter();
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      <FilterChip active={!current} onClick={() => set("status", "")}>Todas</FilterChip>
      {Object.entries(map).map(([k, v]) => (
        <FilterChip key={k} active={current === k} dot={v.color} count={counts[k] ?? 0} onClick={() => set("status", k)}>
          {v.label}
        </FilterChip>
      ))}
    </div>
  );
}
