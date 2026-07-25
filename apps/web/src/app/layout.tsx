import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AIOps Hub — Enterprise AI Agent Platform',
  description: 'Production-ready multi-tenant AI platform with Agent Registry, Prompt Library, streaming chat, and full usage analytics. Built with NestJS + Next.js 15.',
  keywords: ['AI Platform', 'Agent Registry', 'LLM', 'Multi-tenant', 'NestJS', 'Next.js'],
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
