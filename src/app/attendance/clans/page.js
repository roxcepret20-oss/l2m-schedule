"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./clans.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function ClansPage() {
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form state
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function getHeaders() {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const fetchClans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/clans`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setClans(data);
      } else {
        setError(data.message || "Failed to load clans.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClans();
  }, [fetchClans]);

  async function handleAdd(e) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`${API_BASE}/api/clans`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: addName }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddName("");
        await fetchClans();
      } else {
        setAddError(data.message || "Failed to add clan.");
      }
    } catch {
      setAddError("Connection error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(clan) {
    setEditId(clan.id);
    setEditName(clan.name);
    setEditError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditError("");
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`${API_BASE}/api/clans/${editId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (res.ok) {
        cancelEdit();
        await fetchClans();
      } else {
        setEditError(data.message || "Failed to update clan.");
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
      const res = await fetch(`${API_BASE}/api/clans/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchClans();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete clan.");
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
        <h1 className={styles.title}>Clans</h1>
        <p className={styles.subtitle}>Manage all clans</p>
      </div>

      {/* Add Clan */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Add Clan</h2>
        <form onSubmit={handleAdd} className={styles.addForm}>
          <input
            type="text"
            className={styles.input}
            placeholder="Clan name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
          />
          <button type="submit" className={styles.btnPrimary} disabled={addLoading || !addName.trim()}>
            {addLoading ? "Adding…" : "Add Clan"}
          </button>
        </form>
        {addError && <p className={styles.errorText}>{addError}</p>}
      </div>

      {/* Clan List */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>All Clans</h2>
        {error && <p className={styles.errorText}>{error}</p>}
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : clans.length === 0 ? (
          <p className={styles.muted}>No clans found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Updated By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clans.map((clan) => (
                <tr key={clan.id}>
                  <td>
                    {editId === clan.id ? (
                      <form onSubmit={handleUpdate} className={styles.editForm}>
                        <input
                          type="text"
                          className={styles.input}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          autoFocus
                        />
                        {editError && <span className={styles.errorText}>{editError}</span>}
                        <div className={styles.editActions}>
                          <button type="submit" className={styles.btnPrimary} disabled={editLoading || !editName.trim()}>
                            {editLoading ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className={styles.btnGhost} onClick={cancelEdit} disabled={editLoading}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      clan.name
                    )}
                  </td>
                  <td>{clan.updated_by_name || "—"}</td>
                  <td>
                    {editId !== clan.id && (
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => startEdit(clan)}>
                          Edit
                        </button>
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(clan.id)}
                          disabled={deleteLoading && deleteId === clan.id}
                        >
                          {deleteLoading && deleteId === clan.id ? "Deleting…" : "Delete"}
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
