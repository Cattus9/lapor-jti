import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});


export const metadata: Metadata = {
  title: "AspirasiJTI | Portal Pelaporan JTI",
  description: "Portal AspirasiJTI untuk menyampaikan dan memantau laporan internal Jurusan Teknologi Informasi POLIJE.",
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${fontSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        <script
          dangerouslySetInnerHTML={{
            __html: "try { if (localStorage.getItem('laporjti-theme') === 'dark') document.documentElement.classList.add('dark') } catch {}",
          }}
        />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
