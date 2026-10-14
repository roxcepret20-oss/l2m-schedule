"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function UserLoginPage() {
  const router = useRouter();
  const [realIgn, setRealIgn] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState("");

  function toggleResetMode() {
    setResetMode((m) => !m);
    setError("");
    setSuccess("");
    setPassword("");
    setNewPassword("");
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ real_ign: realIgn.trim(), new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResetMode(false);
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
      if (res.ok && data.token) {
        localStorage.setItem("user_auth_token", data.token);
        localStorage.setItem("user_real_ign", data.user.real_ign);
        router.push(`/users/${encodeURIComponent(data.user.real_ign)}`);
      } else {
        setError(data.message || "Invalid username or password.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h1 className={styles.title}>{resetMode ? "Reset Password" : "Member Login"}</h1>
        <p className={styles.subtitle}>
          {resetMode ? "Enter your username and a new password" : "Sign in to manage your profile"}
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
          />
          {resetMode ? (
            <input
              type="password"
              className={styles.input}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
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
            <button type="submit" className={styles.btn} disabled={loading || !realIgn.trim() || !newPassword}>
              {loading ? "Resetting…" : "Reset Password"}
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
