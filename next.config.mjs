/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the resume parsers out of the bundle — they use Node fs/Buffer and are
  // imported dynamically only inside the /api/profile/extract route handler.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
