/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allows builds to complete even if ESLint warnings/errors are present
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allows builds to complete even if type checking encounters warnings
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
