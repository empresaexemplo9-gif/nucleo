import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <PageHeader icon={<Settings />} title="Configurações" description="Personalize o CRM para o jeito que sua empresa vende." />
      <div className="grid gap-6 md:grid-cols-[230px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
