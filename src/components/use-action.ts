"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "./toast";

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

/** Executa uma Server Action com feedback (toast) e atualização da tela. */
export function useAction() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  function run<T extends ActionResult>(fn: () => Promise<T>, opts?: { success?: string; onSuccess?: (r: Extract<T, { ok: true }>) => void }) {
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) {
          if (opts?.success || r.message) toast(opts?.success || r.message!);
          opts?.onSuccess?.(r as Extract<T, { ok: true }>);
          router.refresh();
        } else toast(r.error, "error");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro inesperado", "error");
      }
    });
  }
  return { pending, run };
}
