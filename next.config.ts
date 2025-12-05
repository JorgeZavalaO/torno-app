import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Optimizaciones experimentales
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    ppr: false, // Deshabilitado hasta que sea estable
    optimizeCss: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Skip prerendering for error pages
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Skip build static generation errors
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimizaciones de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  // Headers de caché para recursos estáticos
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
  ],
  
  // Optimizaciones de bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Reduce el tamaño del bundle del cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Optimizaciones de imágenes
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Configuración de output (opcional para deployment)
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  // Configuración estable de Turbopack (resolving aliases)
  // Ver: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#resolving-aliases
  turbopack: {
    // Root absoluto para Turbopack (recomendado cuando la estructura no es estándar)
    root: path.resolve(__dirname),
    // Mapear '@' a la carpeta src usando ruta absoluta para evitar ambigüedades
    resolveAlias: {
      '@': path.resolve(__dirname, 'src'),
    },
    // Extensiones que Turbopack debe considerar al resolver imports
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
};

export default nextConfig;
