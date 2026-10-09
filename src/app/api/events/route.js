import { fetchEvents } from "@/services/events.service";

export async function GET() {
  try {
    const events = await fetchEvents();
    return new Response(JSON.stringify(events), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("API GET /events error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}