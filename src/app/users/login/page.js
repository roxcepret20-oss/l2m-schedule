"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";
import DiscordVerify from "../components/DiscordVerify";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function UserLoginPage() {
  const router = useRouter();
  const [realIgn, setRealIgn] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [linkToken, setLinkToken] = useState("");

  function toggleResetMode() {
    setResetMode((m) => !m);
    setResetCodeSent(false);
    setResetCode("");
    setError("");
    setSuccess("");
    setPassword("");
    setNewPassword("");
  }

  function finishLogin(data) {
    localStorage.setItem("user_auth_token", data.token);
    localStorage.setItem("user_real_ign", data.user.real_ign);
    router.push(`/users/${encodeURIComponent(data.user.real_ign)}`);
  }

  function backToLogin(message) {
    setLinkToken("");
    setPassword("");
    setError(message || "");
  }

  async function handleResetRequest() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/reset-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ real_ign: realIgn.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResetCodeSent(true);
        setSuccess(data.message || "Verification code sent.");
      } else {
        setError(data.message || "Unable to send the code.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!resetCodeSent) {
      handleResetRequest();
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ real_ign: realIgn.trim(), code: resetCode.trim(), new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResetMode(false);
        setResetCodeSent(false);
        setResetCode("");
        setNewPassword("");
        setPassword("");
        setSuccess("Password updated. You can now sign in.");
      } else {
        setError(data.message || "Unable to reset password.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ real_ign: realIgn, password }),
      });
      const data = await res.json();
      if (res.ok && data.needs_discord_link && data.link_token) {
        setLinkToken(data.link_token);
      } else if (res.ok && data.token) {
        finishLogin(data);
      } else {
        setError(data.message || "Invalid username or password.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (linkToken) {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <h1 className={styles.title}>Link Your Discord</h1>
          <p className={styles.subtitle}>
            Your account has no Discord linked yet. Verify your Discord account to continue.
          </p>
          <DiscordVerify mode="link" linkToken={linkToken} onLinked={finishLogin} onLinkExpired={backToLogin} />
          <p className={styles.footerText}>
            <button type="button" className={styles.linkBtn} onClick={() => backToLogin("")}>
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h1 className={styles.title}>{resetMode ? "Reset Password" : "Member Login"}</h1>
        <p className={styles.subtitle}>
          {resetMode
            ? resetCodeSent
              ? "Enter the code we sent to your Discord DMs and a new password"
              : "Enter your username to receive a code on your linked Discord"
            : "Sign in to manage your profile"}
        </p>
        <form onSubmit={resetMode ? handleReset : handleSubmit} className={styles.form}>
          <input
            type="text"
            className={styles.input}
            placeholder="Real IGN"
            value={realIgn}
            onChange={(e) => setRealIgn(e.target.value)}
            autoFocus
            required
            readOnly={resetMode && resetCodeSent}
          />
          {resetMode ? (
            resetCodeSent && (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder="6-digit code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="one-time-code"
                  required
                />
                <input
                  type="password"
                  className={styles.input}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </>
            )
          ) : (
            <input
              type="password"
              className={styles.input}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
          {resetMode ? (
            <button
              type="submit"
              className={styles.btn}
              disabled={loading || !realIgn.trim() || (resetCodeSent && (resetCode.length !== 6 || !newPassword))}
            >
              {resetCodeSent ? (loading ? "Resetting…" : "Reset Password") : loading ? "Sending…" : "Send code"}
            </button>
          ) : (
            <button type="submit" className={styles.btn} disabled={loading || !realIgn || !password}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          )}
        </form>
        <p className={styles.footerText}>
          <button type="button" className={styles.linkBtn} onClick={toggleResetMode}>
            {resetMode ? "Back to sign in" : "Forgot password?"}
          </button>
        </p>
        <p className={styles.footerText}>
          Don&apos;t have an account?{" "}
          <Link href="/users/register" className={styles.footerLink}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
