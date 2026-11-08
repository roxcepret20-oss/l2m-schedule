// "Login with Discord" (OAuth2 authorization-code flow). The API holds the client secret and does the code exchange;
// the browser only needs the public client id, a redirect uri and a CSRF `state`.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const STATE_KEY = "discord_oauth_state";
const VERIFIED_KEY = "discord_oauth_verified";

export const CALLBACK_PATH = "/users/discord/callback";

export function getRedirectUri() {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

export async function fetchDiscordOAuthConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/users/discord/oauth/config`);
    const data = await res.json().catch(() => ({}));
    return res.ok && data.enabled && data.client_id ? data : null;
  } catch {
    return null;
  }
}

// intent: "login" | "register" | "link" (link needs the login `linkToken`).
export async function startDiscordOAuth({ intent, linkToken = null }) {
  const config = await fetchDiscordOAuthConfig();
  if (!config) throw new Error("Login with Discord is not available right now.");

  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, intent, linkToken }));

  const params = new URLSearchParams({
    client_id: config.client_id,
    response_type: "code",
    scope: "identify",
    redirect_uri: getRedirectUri(),
    state,
  });
  window.location.assign(`https://discord.com/oauth2/authorize?${params}`);
}

// Returns the stored { intent, linkToken } when `state` matches what we sent, else null. One-shot.
export function consumeOAuthState(returnedState) {
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
  } catch {
    stored = null;
  }
  sessionStorage.removeItem(STATE_KEY);
  return stored && returnedState && stored.state === returnedState ? stored : null;
}

// Verified Discord identity handed from the callback page to the register page.
export function saveVerifiedDiscord(verified) {
  sessionStorage.setItem(VERIFIED_KEY, JSON.stringify(verified));
}

export function readVerifiedDiscord() {
  try {
    return JSON.parse(sessionStorage.getItem(VERIFIED_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearVerifiedDiscord() {
  sessionStorage.removeItem(VERIFIED_KEY);
}
