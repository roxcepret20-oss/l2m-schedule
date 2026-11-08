"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../login/login.module.css";
import { setSchedulePath } from "../../../../lib/schedulePath";
import { consumeOAuthState, getRedirectUri, saveVerifiedDiscord } from "../../../../lib/discordOAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(`${API_BASE}/api/users/discord/oauth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export default function DiscordCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState("working"); // working | choose | confirm | error
  const [error, setError] = useState("");
  const [account, setAccount] = useState(null); // { discordId, username, token } from needs_account
  const [realIgn, setRealIgn] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function finishLogin(data) {
    localStorage.setItem("user_auth_token", data.token);
    localStorage.setItem("user_real_ign", data.user.real_ign);
    setSchedulePath(data.user.boss_schedule_path);
    router.replace(`/users/${encodeURIComponent(data.user.real_ign)}`);
  }

  function fail(message) {
    setError(message);
    setPhase("error");
  }

  function goRegister(verified) {
    saveVerifiedDiscord(verified);
    router.replace("/users/register");
  }

  useEffect(() => {
    // The authorization code is single use, so never run this twice (React strict mode).
    if (started.current) return;
    started.current = true;

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const stored = consumeOAuthState(params.get("state"));

      if (params.get("error")) {
        fail(params.get("error") === "access_denied" ? "Discord login was cancelled." : "Discord login failed. Please try again.");
        return;
      }
      if (!code || !stored) {
        fail("This Discord login link is invalid or has expired. Please start again.");
        return;
      }

      try {
        const redirect_uri = getRedirectUri();
        if (stored.intent === "link") {
          const { res, data } = await post("/link-account", { link_token: stored.linkToken, code, redirect_uri });
          if (res.ok && data.token) finishLogin(data);
          else fail(data.message || "Could not link your Discord account.");
          return;
        }

        const { res, data } = await post("/login", { code, redirect_uri });
        if (!res.ok) {
          fail(data.message || "Discord login failed.");
        } else if (data.token) {
          finishLogin(data);
        } else if (data.needs_account) {
          const verified = { discordId: data.discord_id, username: data.discord_username, token: data.verification_token };
          if (stored.intent === "register") {
            goRegister(verified);
          } else {
            setAccount(verified);
            setPhase("choose");
          }
        } else {
          fail("Unexpected response. Please try again.");
        }
      } catch {
        fail("Connection error. Please try again.");
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { res, data } = await post("/link", {
        verification_token: account.token,
        real_ign: realIgn.trim(),
        password,
      });
      if (res.ok && data.token) {
        finishLogin(data);
      } else if (res.status === 401 && /verification expired/i.test(data.message || "")) {
        fail(data.message);
      } else {
        setError(data.message || "Could not link your account.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const backLink = (
    <p className={styles.footerText}>
      <Link href="/users/login" className={styles.footerLink}>
        ← Back to sign in
      </Link>
    </p>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {phase === "working" && (
          <>
            <h1 className={styles.title}>Signing you in…</h1>
            <p className={styles.subtitle}>Checking your Discord account</p>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 className={styles.title}>Discord Login</h1>
            <p className={styles.error}>{error}</p>
            {backLink}
          </>
        )}

        {phase === "choose" && account && (
          <>
            <h1 className={styles.title}>Welcome, {account.username || "Discord user"}</h1>
            <p className={styles.subtitle}>
              Your Discord account is not linked to a member yet. Do you already have a member account?
            </p>
            <div className={styles.form}>
              <button type="button" className={styles.btn} onClick={() => setPhase("confirm")}>
                I already have an account
              </button>
              <button type="button" className={styles.btn} onClick={() => goRegister(account)}>
                I&apos;m new, create an account
              </button>
            </div>
            {backLink}
          </>
        )}

        {phase === "confirm" && account && (
          <>
            <h1 className={styles.title}>Confirm Your Account</h1>
            <p className={styles.subtitle}>
              Enter your username and password once to link {account.username || "your Discord"}. Next time Discord login works on its own.
            </p>
            <form onSubmit={handleConfirm} className={styles.form}>
              <input
                type="text"
                className={styles.input}
                placeholder="Real IGN"
                value={realIgn}
                onChange={(e) => setRealIgn(e.target.value)}
                autoFocus
                required
              />
              <input
                type="password"
                className={styles.input}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={styles.btn} disabled={busy || !realIgn.trim() || !password}>
                {busy ? "Linking…" : "Link & Sign In"}
              </button>
            </form>
            <p className={styles.footerText}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  setError("");
                  setPhase("choose");
                }}
              >
                Back
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
