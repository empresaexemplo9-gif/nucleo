"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./ui";
import { useOrg } from "./org-context";
import { DealForm } from "./forms/deal-form";
import { ContactForm } from "./forms/contact-form";
import { CompanyForm } from "./forms/company-form";
import { ActivityForm } from "./forms/activity-form";
import type { Option } from "./pickers";

type Kind = "deal" | "contact" | "company" | "activity";
type Defaults = { pipelineId?: string; stageId?: string; contact?: Option | null; company?: Option | null; deal?: Option | null; type?: string };

const C = createContext<(kind: Kind, defaults?: Defaults) => void>(() => {});
export const useQuickCreate = () => useContext(C);

export function QuickCreateProvider({ children }: { children: React.ReactNode }) {
  const { labels } = useOrg();
  const router = useRouter();
  const [state, setState] = useState<{ kind: Kind; defaults?: Defaults } | null>(null);
  const open = useCallback((kind: Kind, defaults?: Defaults) => setState({ kind, defaults }), []);
  const close = useCallback(() => setState(null), []);
  const titles: Record<Kind, string> = {
    deal: `Novo ${labels.deal.singular.toLowerCase()}`,
    contact: `Novo ${labels.contact.singular.toLowerCase()}`,
    company: `Nova ${labels.company.singular.toLowerCase()}`,
    activity: `Nova ${labels.activity.singular.toLowerCase()}`,
  };
  return (
    <C.Provider value={open}>
      {children}
      <Modal open={!!state} onClose={close} title={state ? titles[state.kind] : ""} wide={state?.kind !== "activity"}>
        {state?.kind === "deal" && <DealForm defaults={state.defaults} onDone={close} />}
        {state?.kind === "contact" && (
          <ContactForm
            defaults={state.defaults}
            onDone={(id) => {
              close();
              if (id) router.push(`/contacts/${id}`);
            }}
          />
        )}
        {state?.kind === "company" && (
          <CompanyForm
            onDone={(id) => {
              close();
              if (id) router.push(`/companies/${id}`);
            }}
          />
        )}
        {state?.kind === "activity" && <ActivityForm defaults={state.defaults} onDone={close} />}
      </Modal>
    </C.Provider>
  );
}
