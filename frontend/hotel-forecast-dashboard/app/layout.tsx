import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TCA · Hotel Intelligence Platform",
  description: "Hotel operations forecasting and business intelligence dashboard by TCA Consulting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
