import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  async rewrites() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) return [];
    // Transparent proxy (not a redirect) keeps Firebase's auth helper same-origin.
    return [{ source: "/__/auth/:path*", destination: `https://${projectId}.firebaseapp.com/__/auth/:path*` }];
  },
};

export default nextConfig;
