"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "../gear_score_formula/gear_score_formula.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function getHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const EMPTY_FORM = { name: "", passcode: "" };

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
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

  async function handleAdd(e) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`${API_BASE}/api/admins`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: addForm.name.trim(), passcode: addForm.passcode }),
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
    setEditForm({ name: admin.name, passcode: "" });
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
      const body = { name: editForm.name.trim() };
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
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={addLoading || !addForm.name.trim() || !addForm.passcode}
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
                            disabled={editLoading || !editForm.name.trim()}
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
