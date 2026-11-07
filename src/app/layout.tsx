import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM", template: `%s · ${process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM"}` },
  description: "CRM completo, personalizável e whitelabel para qualquer tipo de empresa.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="pt-BR" className={`${inter.variable} ${theme === "dark" ? "dark" : ""}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
