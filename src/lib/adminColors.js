// Admins without a chosen color get one from this palette, picked by admin id so it stays stable.
export const DEFAULT_ADMIN_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
];

export function colorForAdmin(admin) {
  if (admin?.color) return admin.color;
  const id = Number(admin?.id);
  return DEFAULT_ADMIN_COLORS[(Number.isFinite(id) ? Math.abs(id) : 0) % DEFAULT_ADMIN_COLORS.length];
}

// Black or white, whichever is easier to read on top of the given #rrggbb background.
export function readableTextColor(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

// Reads the logged-in admin from the stored JWT payload. Display only; the server never trusts this.
export function getCurrentAdmin() {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("auth_token");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.id ? { id: payload.id, name: payload.name } : null;
  } catch {
    return null;
  }
}
