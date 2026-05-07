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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
