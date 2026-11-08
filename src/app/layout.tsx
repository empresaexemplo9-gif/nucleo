import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["300", "400", "500", "600"], style: ["normal", "italic"] });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument", weight: "400", style: ["normal", "italic"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"] });

/** Aplica o tema antes da pintura: cookie salvo ou, na primeira visita, a preferência do sistema. */
const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var r=document.documentElement;r.dataset.theme=t;r.classList.toggle("dark",t==="dark");if(!m){document.cookie="theme="+t+";path=/;max-age=31536000"}}catch(e){}`;

export const metadata: Metadata = {
  title: { default: process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM", template: `%s · ${process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM"}` },
  description: "CRM completo, personalizável e whitelabel para qualquer tipo de empresa.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html
      lang="pt-BR"
      data-theme={theme === "dark" ? "dark" : "light"}
      className={`${sans.variable} ${serif.variable} ${mono.variable} ${theme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
