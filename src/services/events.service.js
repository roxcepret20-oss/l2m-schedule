import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";

export async function fetchEvents() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "x-client": "web-dashboard",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }

  const rows = await res.json();
  return rows || [];
}