import { fetchBossContents } from "@/services/boss.service";

export async function GET() {
  try {
    const bosses = await fetchBossContents();;
    return new Response(JSON.stringify(bosses), { headers: { "Content-Type": "application/json" }});
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}