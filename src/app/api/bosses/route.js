import { fetchBossContents } from "@/services/boss.service";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const namesParam = searchParams.get("names");
    const names = namesParam ? namesParam.split(",").map(n => n.trim()).filter(Boolean) : [];
    const bosses = await fetchBossContents(category, names);
    return new Response(JSON.stringify(bosses), { headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("API GET /bosses error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}