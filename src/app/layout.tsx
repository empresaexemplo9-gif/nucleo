import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM", template: `%s · ${process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM"}` },
  description: "CRM completo, personalizável e whitelabel para qualquer tipo de empresa.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable} ${theme === "dark" ? "dark" : ""}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
