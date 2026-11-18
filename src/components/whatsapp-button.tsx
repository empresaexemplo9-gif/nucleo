"use client";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { openConversationForContact } from "@/actions/whatsapp";

/**
 * Com a integração do WhatsApp no plano, abre a conversa na caixa de Atendimento (com histórico,
 * modelos e registro no CRM). Sem ela, abre o WhatsApp pelo link wa.me.
 */
export function WhatsAppButton({ contactId, phone, className, children }: { contactId: string; phone: string; className?: string; children: React.ReactNode }) {
  const { settings } = useOrg();
  const router = useRouter();
  const { run } = useAction();
  if (!settings.modules.whatsapp)
    return (
      <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  return (
    <button
      type="button"
      className={className}
      onClick={() => run(() => openConversationForContact(contactId), { onSuccess: (r) => r.id && router.push(`/inbox?f=open&c=${r.id}`) })}
    >
      {children}
    </button>
  );
}
