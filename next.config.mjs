/** @type {import('next').NextConfig} */
// Image files keep their names when edited, so cache for a day (and serve stale for a week while
// revalidating) instead of "immutable".
const STATIC_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
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
