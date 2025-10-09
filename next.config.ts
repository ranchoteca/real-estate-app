import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desactivar type checking durante el build en Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Opcional: también desactivar ESLint si da problemas
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Para fotos de perfil de Google
      },
    ],
  },
};

export default nextConfig;