import type { Metadata } from "next";
import { Geist, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Geist : corps, tables, chrome, montants (tabular-nums).
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// Fraunces : RÉSERVÉ aux états financiers / grands totaux (voir DESIGN.md).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// JetBrains Mono : n° de compte, clés d'intégration, aperçus CSV.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MT Conseil — Comptabilité",
  description: "Grand livre en partie double pour MT Conseil.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
