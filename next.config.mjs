/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // O Admin SDK carrega binários e credenciais em runtime: mantê-lo fora do
  // bundle evita que o empacotador tente resolvê-lo estaticamente.
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
