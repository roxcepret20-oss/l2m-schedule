"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./register.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const GEAR_PROOF_FIELDS = [
  { name: "stats_image", label: "Stats" },
  { name: "soulshot_image", label: "Soulshot" },
  { name: "valor_image", label: "Valor" },
  { name: "guardian_image", label: "Guardian" },
];

function toLabel(stat_name) {
  return stat_name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export default function UserRegisterPage() {
  const router = useRouter();
  const [clans, setClans] = useState([]);
  const [statFields, setStatFields] = useState([]);

  const [form, setForm] = useState({
    ign: "",
    real_ign: "",
    clan_id: "",
    password: "",
    confirmPassword: "",
    stats: {},
  });
  const [imageFiles, setImageFiles] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchClans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clans`);
      const data = await res.json();
      if (res.ok) setClans(data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchStatFields = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/gear-score-formulas`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const fields = data.map((row) => ({ name: row.stat_name, label: toLabel(row.stat_name) }));
        setStatFields(fields);
        setForm((f) => ({ ...f, stats: Object.fromEntries(fields.map((sf) => [sf.name, ""])) }));
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchClans();
    fetchStatFields();
  }, [fetchClans, fetchStatFields]);

  function handleInfoChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleStatChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, stats: { ...f.stats, [name]: value } }));
  }

  function handleImageChange(field, e) {
    const file = e.target.files?.[0] ?? null;
    setImageFiles((f) => ({ ...f, [field]: file }));
    setImagePreviews((p) => ({ ...p, [field]: file ? URL.createObjectURL(file) : "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const payload = new FormData();
    payload.append("ign", form.ign.trim());
    payload.append("real_ign", form.real_ign.trim());
    payload.append("clan_id", form.clan_id !== "" ? form.clan_id : "");
    payload.append("password", form.password);
    payload.append("stats", JSON.stringify(Object.fromEntries(
      statFields.map(({ name }) => [
        name,
        form.stats[name] !== undefined && form.stats[name] !== ""
          ? toNum(form.stats[name])
          : null,
      ])
    )));
    GEAR_PROOF_FIELDS.forEach(({ name }) => {
      if (imageFiles[name]) payload.append(name, imageFiles[name]);
    });

    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("user_auth_token", data.token);
        localStorage.setItem("user_real_ign", data.user.real_ign);
        router.push(`/users/${encodeURIComponent(data.user.real_ign)}`);
      } else {
        setError(data.message || "Failed to register.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Your Account</h1>
        <p className={styles.subtitle}>Register to manage your own member profile</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Information</h3>
            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <label className={styles.label}>IGN *</label>
                <input
                  type="text"
                  name="ign"
                  className={styles.input}
                  placeholder="Player name"
                  value={form.ign}
                  onChange={handleInfoChange}
                  required
                  autoFocus
                />
              </div>

              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <label className={styles.label}>Real IGN (used as username) *</label>
                <input
                  type="text"
                  name="real_ign"
                  className={styles.input}
                  placeholder="Real player name"
                  value={form.real_ign}
                  onChange={handleInfoChange}
                  required
                />
              </div>

              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <label className={styles.label}>Clan</label>
                <select
                  name="clan_id"
                  className={styles.input}
                  value={form.clan_id}
                  onChange={handleInfoChange}
                >
                  <option value="">— No Clan —</option>
                  {clans.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Password *</label>
                <input
                  type="password"
                  name="password"
                  className={styles.input}
                  placeholder="Password"
                  value={form.password}
                  onChange={handleInfoChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className={styles.input}
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleInfoChange}
                  required
                />
              </div>
            </div>
          </div>

          {statFields.length > 0 && (
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>Stats</h3>
              <div className={styles.formGrid}>
                {statFields.map(({ name, label }) => (
                  <div className={styles.formField} key={name}>
                    <label className={styles.label}>{label}</label>
                    <input
                      type="number"
                      name={name}
                      className={styles.input}
                      placeholder="0"
                      value={form.stats[name] ?? ""}
                      onChange={handleStatChange}
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Gear Proof</h3>
            <div className={styles.formGrid}>
              {GEAR_PROOF_FIELDS.map(({ name, label }) => (
                <div className={styles.formField} key={name}>
                  <label className={styles.label}>{label}</label>
                  <input
                    type="file"
                    className={styles.input}
                    accept="image/*"
                    onChange={(e) => handleImageChange(name, e)}
                  />
                  {imagePreviews[name] && (
                    <img
                      className={styles.imagePreview}
                      src={imagePreviews[name]}
                      alt={`${label} gear proof preview`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.btn}
            disabled={loading || !form.ign.trim() || !form.real_ign.trim() || !form.password}
          >
            {loading ? "Registering…" : "Register"}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link href="/users/login" className={styles.footerLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
