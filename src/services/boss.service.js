import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";

export async function fetchBossContents() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bosses?select=*`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
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
