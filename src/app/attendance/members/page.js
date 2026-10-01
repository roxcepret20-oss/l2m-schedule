"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./members.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const EMPTY_INFO_FORM = {
  ign: "",
  real_ign: "",
  clan_id: "",
};

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

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`;
}

function buildEmptyStats(statFields) {
  return Object.fromEntries(statFields.map((f) => [f.name, ""]));
}

function buildEmptyForm(statFields) {
  return { ...EMPTY_INFO_FORM, stats: buildEmptyStats(statFields) };
}

function emptyGearProofPreviews() {
  return Object.fromEntries(GEAR_PROOF_FIELDS.map(({ name }) => [name, ""]));
}

function memberToForm(m, statFields) {
  return {
    ign: m.ign ?? "",
    real_ign: m.real_ign ?? "",
    clan_id: m.clan_id ?? "",
    stats: Object.fromEntries(
      statFields.map((f) => [f.name, m.stats?.[f.name] ?? ""])
    ),
  };
}

function toNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [clans, setClans] = useState([]);
  const [statFields, setStatFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_INFO_FORM, stats: {} });
  const [imageFiles, setImageFiles] = useState({});
  const [imagePreviews, setImagePreviews] = useState(emptyGearProofPreviews());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function getHeaders(includeJson = true) {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/members`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setMembers(data);
      else setError(data.message || "Failed to load members.");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clans`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setClans(data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchStatFields = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/gear-score-formulas`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setStatFields(data.map((row) => ({ name: row.stat_name, label: toLabel(row.stat_name) })));
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchClans();
    fetchStatFields();
  }, [fetchMembers, fetchClans, fetchStatFields]);

  function openAdd() {
    setEditingMember(null);
    setForm(buildEmptyForm(statFields));
    setImageFiles({});
    setImagePreviews(emptyGearProofPreviews());
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditingMember(member);
    setForm(memberToForm(member, statFields));
    setImageFiles({});
    setImagePreviews(
      Object.fromEntries(
        GEAR_PROOF_FIELDS.map(({ name }) => [name, getImageUrl(member[name])])
      )
    );
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingMember(null);
    setImageFiles({});
    setImagePreviews(emptyGearProofPreviews());
    setFormError("");
  }

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
    setFormLoading(true);
    setFormError("");

    const payload = new FormData();
    payload.append("ign", form.ign.trim());
    payload.append("real_ign", form.real_ign.trim());
    payload.append("clan_id", form.clan_id !== "" ? form.clan_id : "");
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

    const isEdit = editingMember !== null;
    const url = isEdit
      ? `${API_BASE}/api/members/${editingMember.id}`
      : `${API_BASE}/api/members`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(false),
        body: payload,
      });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        await fetchMembers();
      } else {
        setFormError(data.message || "Failed to save member.");
      }
    } catch {
      setFormError("Connection error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/members/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok || res.status === 204) {
        setConfirmDeleteId(null);
        await fetchMembers();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to delete member.");
        setConfirmDeleteId(null);
      }
    } catch {
      setError("Connection error. Please try again.");
      setConfirmDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Members</h1>
          <p className={styles.subtitle}>Manage all clan members</p>
        </div>
        <button className={styles.btnPrimary} onClick={openAdd}>
          + Add Member
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>All Members</h2>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : members.length === 0 ? (
          <p className={styles.muted}>No members found.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>IGN</th>
                  <th>Real IGN</th>
                  <th>Clan</th>
                  <th>Gear Proof</th>
                  <th>Level</th>
                  <th>Class</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className={styles.ignCell}>
                      <Link href={`/attendance/members/${encodeURIComponent(m.ign)}`} className={styles.ignLink}>
                        {m.ign}
                      </Link>
                    </td>
                    <td>{m.real_ign || <span className={styles.muted}>—</span>}</td>
                    <td>{m.clan_name}</td>
                    <td>
                      {(() => {
                        const count = GEAR_PROOF_FIELDS.filter(({ name }) => m[name]).length;
                        return count > 0 ? (
                          `${count}/${GEAR_PROOF_FIELDS.length}`
                        ) : (
                          <span className={styles.muted}>—</span>
                        );
                      })()}
                    </td>
                    <td>{m.stats?.level ?? "—"}</td>
                    <td>{m.stats?.class ?? "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        {confirmDeleteId === m.id ? (
                          <>
                            <span className={styles.confirmText}>Delete?</span>
                            <button
                              className={styles.btnDeleteConfirm}
                              onClick={() => handleDelete(m.id)}
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? "…" : "Yes"}
                            </button>
                            <button
                              className={styles.btnGhost}
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deleteLoading}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button className={styles.btnEdit} onClick={() => openEdit(m)}>
                              Edit
                            </button>
                            <button
                              className={styles.btnDelete}
                              onClick={() => setConfirmDeleteId(m.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingMember ? "Edit Member" : "Add Member"}
              </h2>
              <button className={styles.modalClose} onClick={closeModal} type="button">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {/* ── Information Section ── */}
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
                    <label className={styles.label}>Real IGN</label>
                    <input
                      type="text"
                      name="real_ign"
                      className={styles.input}
                      placeholder="Real player name"
                      value={form.real_ign}
                      onChange={handleInfoChange}
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
                </div>
              </div>

              {/* ── Stats Section ── */}
              <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Stats</h3>
                {statFields.length === 0 ? (
                  <p className={styles.muted}>Loading stat fields…</p>
                ) : (
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
                )}
              </div>

              {/* ── Gear Proof Section ── */}
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

              {formError && <p className={styles.errorText}>{formError}</p>}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={formLoading || !form.ign.trim()}
                >
                  {formLoading
                    ? editingMember
                      ? "Saving…"
                      : "Adding…"
                    : editingMember
                    ? "Save Changes"
                    : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
