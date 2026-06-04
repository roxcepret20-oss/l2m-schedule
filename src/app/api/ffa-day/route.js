import { fetchFfaDays } from "@/services/ffa.service";

export async function GET() {
  try {
    const ffaDay = await fetchFfaDays();
    return new Response(JSON.stringify(ffaDay), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API GET /ffa-day error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
