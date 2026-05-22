"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./members.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const EMPTY_INFO_FORM = {
  ign: "",
  activity_coin: "",
  clan_id: "",
  latest_grade: "",
};

function toLabel(stat_name) {
  return stat_name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildEmptyStats(statFields) {
  return Object.fromEntries(statFields.map((f) => [f.name, ""]));
}

function buildEmptyForm(statFields) {
  return { ...EMPTY_INFO_FORM, stats: buildEmptyStats(statFields) };
}

function memberToForm(m, statFields) {
  return {
    ign: m.ign ?? "",
    activity_coin: m.activity_coin ?? "",
    clan_id: m.clan_id ?? "",
    latest_grade: m.latest_grade ?? "",
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
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function getHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return {
      "Content-Type": "application/json",
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
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditingMember(member);
    setForm(memberToForm(member, statFields));
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingMember(null);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const payload = {
      ign: form.ign.trim(),
      activity_coin: form.activity_coin !== "" ? toNum(form.activity_coin) : null,
      clan_id: form.clan_id !== "" ? Number(form.clan_id) : null,
      latest_grade: form.latest_grade || null,
      stats: Object.fromEntries(
        statFields.map(({ name }) => [
          name,
          form.stats[name] !== undefined && form.stats[name] !== ""
            ? toNum(form.stats[name])
            : null,
        ])
      ),
    };

    const isEdit = editingMember !== null;
    const url = isEdit
      ? `${API_BASE}/api/members/${editingMember.id}`
      : `${API_BASE}/api/members`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
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
                  <th>Clan</th>
                  <th>Activity Coin</th>
                  <th>Grade</th>
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
                    <td>{m.clan_name}</td>
                    <td>{m.activity_coin ?? "—"}</td>
                    <td>
                      {m.latest_grade ? (
                        <span className={styles.gradeBadge}>{m.latest_grade}</span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
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

                  <div className={styles.formField}>
                    <label className={styles.label}>Activity Coin</label>
                    <input
                      type="number"
                      name="activity_coin"
                      className={styles.input}
                      placeholder="0"
                      value={form.activity_coin}
                      onChange={handleInfoChange}
                      min="0"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Latest Grade</label>
                    <input
                      type="text"
                      name="latest_grade"
                      className={styles.input}
                      placeholder="e.g. S, A, B, C"
                      value={form.latest_grade}
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
