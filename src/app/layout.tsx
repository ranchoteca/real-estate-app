import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import FacebookPixel from '@/components/FacebookPixel';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flow Estate AI - Publica propiedades con IA',
  description: 'Crea y publica anuncios de bienes raíces desde tu celular en segundos usando inteligencia artificial',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
      <GoogleAnalytics gaId="G-KCF1DFNMG6" />
      <FacebookPixel />
    </html>
  );
}