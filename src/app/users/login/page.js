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
        <h1 className={styles.title}>Member Login</h1>
        <p className={styles.subtitle}>Sign in to manage your profile</p>
        <form onSubmit={handleSubmit} className={styles.form}>
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
          <button type="submit" className={styles.btn} disabled={loading || !realIgn || !password}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
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
