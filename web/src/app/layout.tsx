import './globals.css';
import { ReactNode } from 'react';
import { QueryProvider } from '@/hooks/query-provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
