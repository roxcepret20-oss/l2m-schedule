import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";

export async function fetchBossContents(category, names = []) {
  const select = `select=name,type,kill_time,kill_timestamp,interval,percentage,category,updated_by`;
  let filter = '';
  if (category && names.length > 0) {
    const orParts = [`category.eq.${category}`, ...names.map(n => `name.eq.${n}`)].join(',');
    filter = `&or=(${orParts})`;
  } else if (category) {
    filter = `&category=eq.${category}`;
  } else if (names.length > 0) {
    const orParts = names.map(n => `name.eq.${n}`).join(',');
    filter = `&or=(${orParts})`;
  }
  const params = select + filter;
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
