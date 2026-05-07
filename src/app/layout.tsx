import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rolequill",
  description: "Role-specific job application answers grounded in your real profile.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.png",
    apple: "/icon.png",
  },
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="relative min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-multiply [background-image:url('https://www.transparenttextures.com/patterns/p6.png')] dark:opacity-[0.05] dark:mix-blend-overlay" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
