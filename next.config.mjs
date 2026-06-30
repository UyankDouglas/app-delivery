/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Permite fotos de produtos/logos hospedadas externamente (ex.: Unsplash, S3, etc.).
    // Em produção, restrinja os hostnames para os seus domínios de upload.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
