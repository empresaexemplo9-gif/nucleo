"use client";
import { useSyncExternalStore } from "react";
import { Copy, ExternalLink, Mail, MessageCircle } from "lucide-react";
import { Button } from "./ui";
import { useToast } from "./toast";

const noop = () => () => {};

/** Link público com atalhos para copiar, abrir, WhatsApp e e-mail. */
export function ShareLink({ path, message, phone, email, subject }: { path: string; message: string; phone?: string | null; email?: string | null; subject?: string }) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = origin + path;
  const toast = useToast();
  const wa = phone?.replace(/\D/g, "");
  const text = `${message}\n${url}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-fg-2">{url || path}</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast("Link copiado");
          }}
        >
          <Copy className="size-3.5" /> Copiar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={path} target="_blank" rel="noreferrer"><Button type="button" size="sm" variant="ghost"><ExternalLink className="size-3.5" /> Abrir</Button></a>
        <a href={`https://wa.me/${wa ? (wa.length <= 11 ? `55${wa}` : wa) : ""}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          <Button type="button" size="sm" variant="ghost"><MessageCircle className="size-3.5 text-ok" /> WhatsApp</Button>
        </a>
        <a href={`mailto:${email ?? ""}?subject=${encodeURIComponent(subject ?? message)}&body=${encodeURIComponent(text)}`}>
          <Button type="button" size="sm" variant="ghost"><Mail className="size-3.5" /> E-mail</Button>
        </a>
      </div>
    </div>
  );
}
