"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_ADMIN_COLORS, colorForAdmin } from "@/lib/adminColors";
import styles from "../gear_score_formula/gear_score_formula.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function getHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Empty color = "auto": the app picks a default from the admin's id.
const EMPTY_FORM = { name: "", passcode: "", color: "", role: "clan_admin", clan_id: "" };

// Superadmin sees every clan; a clan admin is limited to their own clan.
function RoleFields({ form, clans, onChange }) {
  return (
    <>
      <select
        className={styles.input}
        value={form.role}
        onChange={(e) => onChange({ role: e.target.value, clan_id: e.target.value === "superadmin" ? "" : form.clan_id })}
        aria-label="Role"
      >
        <option value="clan_admin">Clan admin</option>
        <option value="superadmin">Superadmin</option>
      </select>
      {form.role === "clan_admin" && (
        <select
          className={styles.input}
          value={form.clan_id}
          onChange={(e) => onChange({ clan_id: e.target.value })}
          aria-label="Clan"
          required
        >
          <option value="">Select clan…</option>
          {clans.map((clan) => (
            <option key={clan.id} value={clan.id}>{clan.name}</option>
          ))}
        </select>
      )}
    </>
  );
}

function ColorField({ value, fallback, onChange, allowAuto = true }) {
  return (
    <span className={styles.colorField}>
      <input
        type="color"
        className={styles.colorInput}
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Tick color"
        title="Color used for this admin's ticks"
      />
      {allowAuto && (value ? (
        <button type="button" className={styles.linkBtn} onClick={() => onChange("")}>Use auto</button>
      ) : (
        <span className={styles.swatchLabel}>auto</span>
      ))}
    </span>
  );
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // A color not used by any admin yet, so a new admin starts out distinguishable.
  const suggestedColor =
    DEFAULT_ADMIN_COLORS.find((c) => !admins.some((a) => colorForAdmin(a).toLowerCase() === c)) ??
    DEFAULT_ADMIN_COLORS[admins.length % DEFAULT_ADMIN_COLORS.length];

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admins`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setAdmins(data);
      } else {
        setError(data.message || "Failed to load admins.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    fetch(`${API_BASE}/api/clans`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setClans)
      .catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`${API_BASE}/api/admins`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: addForm.name.trim(),
          passcode: addForm.passcode,
          color: addForm.color || suggestedColor,
          role: addForm.role,
          clan_id: addForm.role === "clan_admin" ? Number(addForm.clan_id) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddForm(EMPTY_FORM);
        await fetchAdmins();
      } else {
        setAddError(data.message || "Failed to add admin.");
      }
    } catch {
      setAddError("Connection error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(admin) {
    setEditId(admin.id);
    setEditForm({
      name: admin.name,
      passcode: "",
      color: admin.color || "",
      role: admin.role || "clan_admin",
      clan_id: admin.clan_id ? String(admin.clan_id) : "",
    });
    setEditError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm(EMPTY_FORM);
    setEditError("");
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      const body = {
        name: editForm.name.trim(),
        color: editForm.color || null,
        role: editForm.role,
        clan_id: editForm.role === "clan_admin" ? Number(editForm.clan_id) : null,
      };
      if (editForm.passcode) body.passcode = editForm.passcode;
      const res = await fetch(`${API_BASE}/api/admins/${editId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        cancelEdit();
        await fetchAdmins();
      } else {
        setEditError(data.message || "Failed to update admin.");
      }
    } catch {
      setEditError("Connection error. Please try again.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id) {
    setDeleteId(id);
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admins/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchAdmins();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to delete admin.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admins</h1>
        <p className={styles.subtitle}>Manage admin accounts</p>
      </div>

      {/* Add Admin */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Add Admin</h2>
        <form onSubmit={handleAdd} className={styles.addForm}>
          <input
            type="text"
            className={styles.input}
            placeholder="Name"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="password"
            className={styles.input}
            placeholder="Passcode"
            value={addForm.passcode}
            onChange={(e) => setAddForm((f) => ({ ...f, passcode: e.target.value }))}
            required
          />
          <RoleFields form={addForm} clans={clans} onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))} />
          <ColorField
            allowAuto={false}
            value={addForm.color}
            fallback={suggestedColor}
            onChange={(color) => setAddForm((f) => ({ ...f, color }))}
          />
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={addLoading || !addForm.name.trim() || !addForm.passcode || (addForm.role === "clan_admin" && !addForm.clan_id)}
          >
            {addLoading ? "Adding…" : "Add Admin"}
          </button>
        </form>
        {addError && <p className={styles.errorText}>{addError}</p>}
      </div>

      {/* Admin List */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>All Admins</h2>
        {error && <p className={styles.errorText}>{error}</p>}
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : admins.length === 0 ? (
          <p className={styles.muted}>No admins found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role / Clan</th>
                <th>Color</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    {editId === admin.id ? (
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        autoFocus
                      />
                    ) : (
                      admin.name
                    )}
                  </td>
                  <td>
                    {editId === admin.id ? (
                      <RoleFields form={editForm} clans={clans} onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))} />
                    ) : admin.role === "superadmin" ? (
                      "Superadmin (all clans)"
                    ) : admin.clan_name ? (
                      `Clan admin · ${admin.clan_name}`
                    ) : (
                      <span className={styles.muted}>No clan assigned</span>
                    )}
                  </td>
                  <td>
                    {editId === admin.id ? (
                      <ColorField
                        value={editForm.color}
                        fallback={colorForAdmin({ id: admin.id })}
                        onChange={(color) => setEditForm((f) => ({ ...f, color }))}
                      />
                    ) : (
                      <>
                        <span className={styles.swatch} style={{ background: colorForAdmin(admin) }} />
                        {!admin.color && <span className={styles.swatchLabel}>auto</span>}
                      </>
                    )}
                  </td>
                  <td>
                    {editId === admin.id ? (
                      <form onSubmit={handleUpdate}>
                        <div className={styles.actions}>
                          <input
                            type="password"
                            className={styles.input}
                            placeholder="New passcode (optional)"
                            value={editForm.passcode}
                            onChange={(e) => setEditForm((f) => ({ ...f, passcode: e.target.value }))}
                          />
                        </div>
                        {editError && <p className={styles.errorText}>{editError}</p>}
                        <div className={styles.actions} style={{ marginTop: 8 }}>
                          <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={editLoading || !editForm.name.trim() || (editForm.role === "clan_admin" && !editForm.clan_id)}
                          >
                            {editLoading ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className={styles.btnGhost} onClick={cancelEdit} disabled={editLoading}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => startEdit(admin)}>
                          Edit
                        </button>
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(admin.id)}
                          disabled={deleteLoading && deleteId === admin.id}
                        >
                          {deleteLoading && deleteId === admin.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
