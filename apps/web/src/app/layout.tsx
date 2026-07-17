import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AIOps Hub',
  description: 'Production-ready AI Automation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
