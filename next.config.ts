import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: "http://127.0.0.1:3001/api/health",
      },
      {
        source: "/api/users/:path*",
        destination: "http://127.0.0.1:3001/api/users/:path*",
      },
      {
        source: "/api/friends/:path*",
        destination: "http://127.0.0.1:3001/api/friends/:path*",
      },
      {
        source: "/api/messages/:path*",
        destination: "http://127.0.0.1:3001/api/messages/:path*",
      },
      {
        source: "/api/posts/:path*",
        destination: "http://127.0.0.1:3001/api/posts/:path*",
      },
      {
        source: "/api/comments/:path*",
        destination: "http://127.0.0.1:3001/api/comments/:path*",
      },
      {
        source: "/api/forum/:path*",
        destination: "http://127.0.0.1:3001/api/forum/:path*",
      },
      {
        source: "/api/likes/:path*",
        destination: "http://127.0.0.1:3001/api/likes/:path*",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
        pathname: "/steam/apps/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.yandex.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.mds.yandex.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;