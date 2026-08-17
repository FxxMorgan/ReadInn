/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'read.cypher.cl' }],
  },
};

export default nextConfig;
