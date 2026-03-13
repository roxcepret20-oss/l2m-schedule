"use client";

import { useState, useEffect } from "react";

const AUTH_KEY = "shatter_authed";

export default function PinGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) { setChecked(true); return; }

    fetch("/api/validate-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: saved }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setAuthed(true);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      })
      .catch(() => {
        // network error — keep authed to avoid locking out on bad connection
        setAuthed(true);
      })
      .finally(() => setChecked(true));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem(AUTH_KEY, pin);
        setAuthed(true);
      } else {
        setError("Incorrect PIN. Please try again.");
        setPin("");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;
  if (authed) return children;

  return (
    <div className="pin-overlay">
      <div className="pin-card">
        <h1 className="pin-title">Shatter Schedule</h1>
        <p className="pin-subtitle">Enter your PIN to continue</p>
        <form onSubmit={handleSubmit} className="pin-form">
          <input
            type="password"
            inputMode="numeric"
            className="pin-input"
            placeholder="• • • • • •"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            maxLength={32}
          />
          {error && <p className="pin-error">{error}</p>}
          <button type="submit" className="pin-btn" disabled={loading || !pin}>
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
