import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <PageHeader eyebrow="07 / Configurações" icon={<Settings />} title="Ajustes da plataforma" highlight="plataforma" description="Personalize o CRM para o jeito que sua empresa vende." />
      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
