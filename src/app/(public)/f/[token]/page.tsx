import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formSettings, PUBLIC_TYPES } from "@/lib/module-public";
import { PublicBrandStyles, PublicFooter, PublicLogo } from "@/components/public-brand";
import { PublicForm } from "./public-form";

async function load(token: string) {
  return db.customModule.findUnique({ where: { formToken: token }, include: { org: true, fields: { orderBy: { position: "asc" } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const m = await load((await params).token);
  if (!m) return { title: "Formulário" };
  const t = formSettings(m.settings).title || `Solicitar ${m.singular.toLowerCase()}`;
  return { title: `${t} · ${m.org.name}`, robots: { index: false }, ...(m.org.logoUrl ? { icons: { icon: m.org.logoUrl } } : {}) };
}

/** Formulário público de um módulo: o cliente faz o pedido, agendamento ou solicitação sem login. */
export default async function PublicModuleForm({ params }: { params: Promise<{ token: string }> }) {
  const m = await load((await params).token);
  if (!m) notFound();
  const cfg = formSettings(m.settings);
  const fields = m.fields.filter((f) => cfg.fields.includes(f.key) && PUBLIC_TYPES.includes(f.type));
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <PublicBrandStyles org={m.org} />
      <div className="mb-8"><PublicLogo org={m.org} height={48} /></div>
      <div className="card-drap card-grid-top p-6 sm:p-8">
        <h1 className="text-[clamp(26px,4vw,38px)] font-medium leading-[1.08] tracking-[-0.04em]">{cfg.title || `Solicitar ${m.singular.toLowerCase()}`}</h1>
        {cfg.intro && <p className="mt-3 whitespace-pre-line text-[15px] font-light leading-relaxed text-fg-2">{cfg.intro}</p>}
        <PublicForm token={m.formToken!} fields={fields.map((f) => ({ id: f.id, key: f.key, label: f.label, type: f.type, options: f.options, required: f.required, showInList: f.showInList }))} />
      </div>
      <PublicFooter org={m.org} />
    </main>
  );
}
