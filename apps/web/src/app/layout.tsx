import "./globals.css";
import { Metadata } from "next";
import { Providers } from "../components/providers";

export const metadata: Metadata = {
  title: "AIOps Hub — Enterprise AI Agent Platform",
  description:
    "Production-ready multi-tenant AI platform with Agent Registry, Prompt Library, streaming chat, and full usage analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#060608] text-[#f4f4f5]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
