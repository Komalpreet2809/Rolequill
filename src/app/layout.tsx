import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rolequill",
  description: "Role-specific job application answers grounded in your real profile.",
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
