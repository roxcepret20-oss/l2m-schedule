import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";

export async function fetchBossContents(category) {
  const params = `select=name,type,kill_time,interval,percentage,category,updated_by`
    + (category ? `&category=eq.${category}` : '');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bosses?${params}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "x-client": "web-dashboard",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }

  const rows = await res.json();
  return rows || [];
}
