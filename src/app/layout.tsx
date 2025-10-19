import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: 'RealFlow - Publica propiedades con IA',
  description: 'Crea y publica anuncios de bienes raíces desde tu celular en segundos usando inteligencia artificial',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}