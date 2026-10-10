"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

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

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { real_ign } = useParams();
  const decodedRealIgn = decodeURIComponent(real_ign);

  const [member, setMember] = useState(null);
  const [statFields, setStatFields] = useState([]);
  const [stats, setStats] = useState({});
  const [ign, setIgn] = useState("");
  const [imageFiles, setImageFiles] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("user_auth_token") : null;
  }

  function handleLogout() {
    localStorage.removeItem("user_auth_token");
    localStorage.removeItem("user_real_ign");
    router.replace("/users/login");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const storedRealIgn = typeof window !== "undefined" ? localStorage.getItem("user_real_ign") : null;
    if (storedRealIgn && storedRealIgn !== decodedRealIgn) {
      router.replace(`/users/${encodeURIComponent(storedRealIgn)}`);
      return;
    }

    const token = getToken();
    try {
      const [profileRes, formulasRes] = await Promise.all([
        fetch(`${API_BASE}/api/users/${encodeURIComponent(decodedRealIgn)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/gear-score-formulas`),
      ]);

      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        if (profileRes.status === 401 || profileRes.status === 403) {
          handleLogout();
          return;
        }
        setError(profileData.message || "Failed to load your profile.");
        return;
      }

      setMember(profileData);
      setIgn(profileData.ign ?? "");

      const formulasData = await formulasRes.json();
      const fields = formulasRes.ok && Array.isArray(formulasData)
        ? formulasData.map((row) => ({ name: row.stat_name, label: toLabel(row.stat_name) }))
        : [];
      setStatFields(fields);
      setStats(Object.fromEntries(fields.map((f) => [f.name, profileData.stats?.[f.name] ?? ""])));
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedRealIgn, router]);

  useEffect(() => {
    load();
  }, [load]);

  function handleStatChange(e) {
    const { name, value } = e.target;
    setStats((s) => ({ ...s, [name]: value }));
  }

  function handleImageChange(field, e) {
    const file = e.target.files?.[0] ?? null;
    setImageFiles((f) => ({ ...f, [field]: file }));
    setImagePreviews((p) => ({ ...p, [field]: file ? URL.createObjectURL(file) : "" }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const trimmedIgn = ign.trim();
    if (!trimmedIgn) {
      setSaveError("IGN cannot be empty.");
      setSaving(false);
      return;
    }

    const payload = new FormData();
    payload.append("ign", trimmedIgn);
    payload.append("stats", JSON.stringify(Object.fromEntries(
      statFields.map(({ name }) => [
        name,
        stats[name] !== undefined && stats[name] !== "" ? toNum(stats[name]) : null,
      ])
    )));
    GEAR_PROOF_FIELDS.forEach(({ name }) => {
      if (imageFiles[name]) payload.append(name, imageFiles[name]);
    });

    try {
      const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(decodedRealIgn)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: payload,
      });
      const data = await res.json();
      if (res.ok) {
        setMember(data);
        setIgn(data.ign ?? trimmedIgn);
        setImageFiles({});
        setImagePreviews({});
        setSaveSuccess(true);
      } else {
        setSaveError(data.message || "Failed to save changes.");
      }
    } catch {
      setSaveError("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>Manage your own stats and gear proof</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnGhost} onClick={() => router.push("/leaderboard")}>
            Leaderboard
          </button>
          <button className={styles.btnGhost} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && member && (
        <>
          <form onSubmit={handleSave}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel} htmlFor="ign">IGN</label>
                <input
                  id="ign"
                  type="text"
                  className={styles.input}
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  required
                />
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Real IGN</span>
                <span className={styles.infoValue}>{member.real_ign}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Clan</span>
                <span className={styles.infoValue}>
                  {member.clan_name ?? <span className={styles.muted}>—</span>}
                </span>
              </div>
            </div>
          </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Stats</h2>
              {statFields.length === 0 ? (
                <p className={styles.muted}>No stat formulas configured.</p>
              ) : (
                <div className={styles.formGrid}>
                  {statFields.map(({ name, label }) => (
                    <div className={styles.formField} key={name}>
                      <label className={styles.label}>{label}</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="0"
                        value={stats[name] ?? ""}
                        onChange={handleStatChange}
                        name={name}
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Gear Proof</h2>
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
                    <img
                      className={styles.imagePreview}
                      src={imagePreviews[name] || getImageUrl(member[name])}
                      alt={`${label} gear proof`}
                      style={{ display: imagePreviews[name] || member[name] ? "block" : "none" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {saveError && <p className={styles.errorText}>{saveError}</p>}
            {saveSuccess && <p className={styles.successText}>Saved successfully.</p>}

            <div className={styles.actions}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
