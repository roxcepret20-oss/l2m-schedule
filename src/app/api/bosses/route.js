import { fetchBossContents } from "@/services/boss.service";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const namesParam = searchParams.get("names");
    const source = searchParams.get("source");
    const names = namesParam ? namesParam.split(",").map(n => n.trim()).filter(Boolean) : [];
    const TABLES_BY_SOURCE = { duplicate: "bosses_duplicate", farm: "bosses_for_farm" };
    const tableName = TABLES_BY_SOURCE[source] || "bosses";
    const bosses = await fetchBossContents(category, names, tableName);
    return new Response(JSON.stringify(bosses), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("API GET /bosses error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}