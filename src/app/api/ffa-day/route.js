import { fetchFfaDays } from "@/services/ffa.service";

export async function GET() {
  try {
    const ffaDay = await fetchFfaDays();
    return new Response(JSON.stringify(ffaDay), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("API GET /ffa-day error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
