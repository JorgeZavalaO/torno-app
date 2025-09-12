import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCostingParamByKey } from "@/app/server/queries/costing-params";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Torno Manager",
  description: "Gestión del Área de Torno",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Obtener currency en servidor y exponerlo como variable global para clientes
  let currency = "PEN";
  try {
    const cur = await getCostingParamByKey("currency");
    if (cur?.valueText) currency = String(cur.valueText).toUpperCase();
  } catch {
    // noop
  }

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Inyecta variable global para clientes */}
        <script dangerouslySetInnerHTML={{ __html: `window.__APP_CURRENCY = "${currency}";` }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
