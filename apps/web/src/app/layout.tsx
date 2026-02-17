import type { Metadata } from 'next';
import { LocaleProvider } from '@/contexts/LocaleContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Multi-tenant Shop + WhatsApp Order',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="lo">
      <body className="min-h-screen bg-gray-50 text-gray-900 lao-text">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
