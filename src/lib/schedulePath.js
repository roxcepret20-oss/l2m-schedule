// Per-clan boss schedule page for logged-in members (clans.boss_schedule_path from the API).
const STORAGE_KEY = "user_boss_schedule_path";
const DEFAULT_PATH = "/";

// Internal paths only: a single leading "/", no backslash, whitespace or control characters.
function isSafePath(path) {
  return typeof path === "string" && /^\/(?!\/)[^\s\\\u0000-\u001f\u007f]*$/.test(path);
}

export function getSchedulePath() {
  if (typeof window === "undefined") return DEFAULT_PATH;
  const stored = localStorage.getItem(STORAGE_KEY);
  return isSafePath(stored) ? stored : DEFAULT_PATH;
}

export function setSchedulePath(path) {
  if (isSafePath(path)) localStorage.setItem(STORAGE_KEY, path);
  else localStorage.removeItem(STORAGE_KEY);
}

export function clearSchedulePath() {
  localStorage.removeItem(STORAGE_KEY);
}
