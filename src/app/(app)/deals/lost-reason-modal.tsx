"use client";
import { useState } from "react";
import { setDealStatus } from "@/actions/deals";
import { Button, Field, Modal, Select, Textarea } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";

export function LostReasonModal({ dealId, onClose, onDone }: { dealId: string | null; onClose: () => void; onDone: () => void }) {
  const { lostReasons } = useOrg();
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const { pending, run } = useAction();
  return (
    <Modal open={!!dealId} onClose={onClose} title="Marcar como perdido">
      <div className="space-y-4">
        <Field label="Motivo da perda">
          <Select value={reason} onChange={(e) => setReason(e.target.value)} autoFocus>
            <option value="">Selecione…</option>
            {lostReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
            <option value="Outro">Outro</option>
          </Select>
        </Field>
        <Field label="Comentário (opcional)">
          <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="O que aprendemos com esta perda?" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(() => setDealStatus(dealId!, "LOST", [reason, detail].filter(Boolean).join(" — ") || undefined), {
                onSuccess: () => {
                  setReason("");
                  setDetail("");
                  onDone();
                },
              })
            }
          >
            Marcar como perdido
          </Button>
        </div>
      </div>
    </Modal>
  );
}
