"use client";

import { useEffect, useState } from "react";
import styles from "./discord-verify.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const RESEND_SECONDS = 60;

/**
 * Discord ID + DM verification code.
 * mode "register": proves ownership of an id; reports { discordId, token } via onVerified (null when edited again).
 * mode "link": needs the login `linkToken`; on success the API returns the normal login payload, passed to onLinked.
 */
export default function DiscordVerify({ mode, linkToken, labelClassName, onVerified, onLinked, onLinkExpired }) {
  const [discordId, setDiscordId] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const idValid = /^\d{17,20}$/.test(discordId);
  const base = mode === "link" ? "/api/users/discord/link" : "/api/users/discord/register";

  async function post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  function handleFailure(res, data, fallback) {
    if (mode === "link" && res.status === 401 && onLinkExpired) {
      onLinkExpired(data.message || "Session expired. Please sign in again.");
      return;
    }
    if (res.status === 429) {
      const wait = /wait (\d+)s/.exec(data.message || "");
      if (wait) setCooldown(Number(wait[1]));
    }
    setError(data.message || fallback);
  }

  function handleIdChange(e) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 20);
    setDiscordId(value);
    setCode("");
    setSent(false);
    setError("");
    setInfo("");
    if (verified) {
      setVerified(false);
      onVerified?.(null);
    }
  }

  async function sendCode() {
    if (!idValid || busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const { res, data } = await post(`${base}/send-code`, { discord_id: discordId, link_token: linkToken });
      if (res.ok) {
        setSent(true);
        setCooldown(RESEND_SECONDS);
        setInfo("Code sent. Check your Discord DMs (valid for 10 minutes).");
      } else {
        handleFailure(res, data, "Could not send the code.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!sent || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true);
    setError("");
    try {
      const path = mode === "link" ? `${base}/verify` : `${base}/verify-code`;
      const { res, data } = await post(path, { discord_id: discordId, code, link_token: linkToken });
      if (!res.ok) {
        handleFailure(res, data, "Could not verify the code.");
        return;
      }
      if (mode === "link") {
        onLinked?.(data);
      } else {
        setVerified(true);
        setInfo("");
        onVerified?.({ discordId, token: data.verification_token });
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function enterTo(action) {
    return (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        action();
      }
    };
  }

  return (
    <div className={styles.wrap}>
      <label className={labelClassName || styles.label}>Discord User ID *</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={styles.input}
        placeholder="e.g. 123456789012345678"
        value={discordId}
        onChange={handleIdChange}
        onKeyDown={enterTo(sendCode)}
        disabled={busy}
      />
      <p className={styles.hint}>
        Discord → Settings → Advanced → enable Developer Mode, then right-click your profile → Copy User ID. You must be in our Discord server and allow DMs from server members.
      </p>

      {verified ? (
        <p className={styles.success}>✓ Discord account verified</p>
      ) : (
        <>
          <button type="button" className={styles.secondaryBtn} onClick={sendCode} disabled={!idValid || busy || cooldown > 0}>
            {busy && !sent ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : sent ? "Resend code" : "Send code to my Discord DM"}
          </button>
          {sent && (
            <div className={styles.codeRow}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={styles.input}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={enterTo(verifyCode)}
                disabled={busy}
              />
              <button type="button" className={styles.primaryBtn} onClick={verifyCode} disabled={busy || code.length !== 6}>
                {mode === "link" ? "Verify & sign in" : "Verify"}
              </button>
            </div>
          )}
        </>
      )}
      {info && !verified && <p className={styles.info}>{info}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
