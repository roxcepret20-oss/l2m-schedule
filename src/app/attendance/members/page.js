"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./members.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const CLAN_FILTER_ALL = "all";
const CLAN_FILTER_NONE = "none";

const EMPTY_INFO_FORM = {
  ign: "",
  real_ign: "",
  clan_id: "",
  discord_user_id: "",
};

const DISCORD_FILTER_ALL = "all";
const DISCORD_FILTER_NONE = "none";
const DISCORD_FILTER_LINKED = "linked";
const DISCORD_FILTER_MISSING = "not_in_server";

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
    discord_user_id: m.discord_user_id ?? "",
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
  const [clanFilter, setClanFilter] = useState(CLAN_FILTER_ALL);
  const [discordFilter, setDiscordFilter] = useState(DISCORD_FILTER_ALL);
  const [discordStatus, setDiscordStatus] = useState({});
  const [discordChecking, setDiscordChecking] = useState(false);

  const filteredMembers = members.filter((m) => {
    if (discordFilter === DISCORD_FILTER_NONE && m.discord_user_id) return false;
    if (discordFilter === DISCORD_FILTER_LINKED && !m.discord_user_id) return false;
    if (discordFilter === DISCORD_FILTER_MISSING && discordStatus[m.id] !== "not_in_server") return false;
    if (clanFilter === CLAN_FILTER_ALL) return true;
    if (clanFilter === CLAN_FILTER_NONE) return m.clan_id == null;
    return String(m.clan_id) === clanFilter;
  });

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
        const memberId = isEdit ? editingMember.id : data.id;
        const nextDiscord = form.discord_user_id.trim();
        const prevDiscord = isEdit ? editingMember.discord_user_id ?? "" : "";
        let discordError = "";
        if (nextDiscord !== prevDiscord) {
          const discordRes = await fetch(`${API_BASE}/api/discord/members/${memberId}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ discord_user_id: nextDiscord || null }),
          });
          if (discordRes.ok) {
            setDiscordStatus((s) => {
              const { [memberId]: _removed, ...rest } = s;
              return rest;
            });
          } else {
            const discordData = await discordRes.json().catch(() => ({}));
            discordError = discordData.message || "Failed to update Discord ID.";
          }
        }
        closeModal();
        await fetchMembers();
        if (discordError) setError(`Member saved, but the Discord ID was not updated: ${discordError}`);
      } else {
        setFormError(data.message || "Failed to save member.");
      }
    } catch {
      setFormError("Connection error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  }

  async function checkDiscord() {
    setDiscordChecking(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/discord/members/check`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDiscordStatus(Object.fromEntries(data.results.map((r) => [r.member_id, r.status])));
        if (data.truncated) setError("Only the first 300 linked members were checked.");
        else if (data.results.some((r) => r.status === "error")) setError("Some members could not be checked (Discord error). Try again.");
        await fetchMembers();
      } else {
        setError(data.message || "Failed to check Discord.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setDiscordChecking(false);
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
        <div className={styles.cardHeader}>
          <h2 className={styles.sectionTitle}>All Members</h2>
          <div className={styles.filter}>
            {(clanFilter !== CLAN_FILTER_ALL || discordFilter !== DISCORD_FILTER_ALL) && (
              <span className={styles.filterCount}>
                Showing {filteredMembers.length} of {members.length}
              </span>
            )}
            <button
              type="button"
              className={styles.btnGhost}
              onClick={checkDiscord}
              disabled={discordChecking}
              title="Check that every linked Discord account is still in our server"
            >
              {discordChecking ? "Checking…" : "Check Discord"}
            </button>
            <select
              className={styles.filterSelect}
              value={discordFilter}
              onChange={(e) => setDiscordFilter(e.target.value)}
              aria-label="Filter by Discord status"
            >
              <option value={DISCORD_FILTER_ALL}>Any Discord</option>
              <option value={DISCORD_FILTER_LINKED}>Discord linked</option>
              <option value={DISCORD_FILTER_NONE}>No Discord ID</option>
              <option value={DISCORD_FILTER_MISSING}>Not in server (after check)</option>
            </select>
            <select
              className={styles.filterSelect}
              value={clanFilter}
              onChange={(e) => setClanFilter(e.target.value)}
              aria-label="Filter by clan"
            >
              <option value={CLAN_FILTER_ALL}>All clans</option>
              {clans.map((clan) => (
                <option key={clan.id} value={String(clan.id)}>
                  {clan.name}
                </option>
              ))}
              <option value={CLAN_FILTER_NONE}>No clan</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : filteredMembers.length === 0 ? (
          <p className={styles.muted}>No members found.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>IGN</th>
                  <th>Real IGN</th>
                  <th>Clan</th>
                  <th>Discord</th>
                  <th>Gear Proof</th>
                  <th>Level</th>
                  <th>Class</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td className={styles.ignCell}>
                      <Link href={`/attendance/members/${encodeURIComponent(m.ign)}`} className={styles.ignLink}>
                        {m.ign}
                      </Link>
                    </td>
                    <td>{m.real_ign || <span className={styles.muted}>—</span>}</td>
                    <td>{m.clan_name}</td>
                    <td>
                      {m.discord_user_id ? (
                        <span title={m.discord_user_id}>
                          {m.discord_username || m.discord_user_id}
                          {discordStatus[m.id] === "not_in_server" && <span className={styles.badgeWarn}>not in server</span>}
                          {discordStatus[m.id] === "in_server" && <span className={styles.badgeOk}>in server</span>}
                          {discordStatus[m.id] === "error" && <span className={styles.badgeMuted}>check failed</span>}
                        </span>
                      ) : (
                        <span className={styles.badgeMuted}>no Discord ID</span>
                      )}
                    </td>
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

                  <div className={`${styles.formField} ${styles.fullWidth}`}>
                    <label className={styles.label}>Discord User ID</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="discord_user_id"
                      className={styles.input}
                      placeholder="17-20 digit Discord ID (must be in our server)"
                      value={form.discord_user_id}
                      onChange={(e) => setForm((f) => ({ ...f, discord_user_id: e.target.value.replace(/\D/g, "").slice(0, 20) }))}
                    />
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
