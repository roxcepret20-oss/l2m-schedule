/** @type {import('next').NextConfig} */
// Image files keep their names when edited, so cache for a day (and serve stale for a week while
// revalidating) instead of "immutable".
const STATIC_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

// The /alt-server pages are kept in the code but currently closed: visitors are sent to /forbidden-page.
// Set to false to open them again.
const ALT_SERVER_CLOSED = true;

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    if (!ALT_SERVER_CLOSED) return [];
    return [
      { source: "/alt-server", destination: "/forbidden-page", permanent: false },
      { source: "/alt-server/pipeline", destination: "/forbidden-page", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:file(.+\\.(?:png|jpg|jpeg|webp|svg|ico))",
        headers: [{ key: "Cache-Control", value: STATIC_CACHE }],
      },
      {
        source: "/noka_theme/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_CACHE }],
      },
    ];
  },
};

export default nextConfig;
