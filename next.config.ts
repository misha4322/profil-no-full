/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  async rewrites() {
    return [
      {
        source: "/api/users/:path*",
        destination: "http://127.0.0.1:3001/api/users/:path*",
      },
      {
        source: "/api/friends/:path*",
        destination: "http://127.0.0.1:3001/api/friends/:path*",
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
        port: "",
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
=======
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.steamstatic.com',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'cdn.cloudflare.steamstatic.com',
        port: '',
        pathname: '/steam/apps/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.yandex.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.mds.yandex.net',
        pathname: '/**',
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
      },
    ],
  },
};

export default nextConfig;