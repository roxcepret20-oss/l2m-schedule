import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  let pin;
  try {
    ({ pin } = await request.json());
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  if (!pin || typeof pin !== "string" || pin.length > 32) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pin_validation?pin=eq.${encodeURIComponent(pin)}&select=pin&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }

  const rows = await res.json();
  return NextResponse.json({ valid: Array.isArray(rows) && rows.length > 0 });
}
