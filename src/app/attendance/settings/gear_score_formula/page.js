"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./gear_score_formula.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function getAdminIdFromToken() {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.id ?? payload.userId ?? payload.sub ?? null;
  } catch {
    return null;
  }
}

function getHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const EMPTY_FORM = { stat_name: "", stat_multiplier: "" };

export default function GearScoreFormulaPage() {
  const [formulas, setFormulas] = useState([]);
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

  const fetchFormulas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/gear-score-formulas`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setFormulas(data);
      } else {
        setError(data.message || "Failed to load formulas.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

  async function handleAdd(e) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`${API_BASE}/api/gear-score-formulas`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          stat_name: addForm.stat_name,
          stat_multiplier: Number(addForm.stat_multiplier),
          updated_by: getAdminIdFromToken(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddForm(EMPTY_FORM);
        await fetchFormulas();
      } else {
        setAddError(data.message || "Failed to add formula.");
      }
    } catch {
      setAddError("Connection error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(formula) {
    setEditId(formula.id);
    setEditForm({ stat_name: formula.stat_name, stat_multiplier: String(formula.stat_multiplier) });
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
      const res = await fetch(`${API_BASE}/api/gear-score-formulas/${editId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          stat_name: editForm.stat_name,
          stat_multiplier: Number(editForm.stat_multiplier),
          updated_by: getAdminIdFromToken(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        cancelEdit();
        await fetchFormulas();
      } else {
        setEditError(data.message || "Failed to update formula.");
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
      const res = await fetch(`${API_BASE}/api/gear-score-formulas/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchFormulas();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete formula.");
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
        <h1 className={styles.title}>Gear Score Formula</h1>
        <p className={styles.subtitle}>Manage stat multipliers used in gear score calculations</p>
      </div>

      {/* Add Formula */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Add Formula</h2>
        <form onSubmit={handleAdd} className={styles.addForm}>
          <input
            type="text"
            className={styles.input}
            placeholder="Stat name"
            value={addForm.stat_name}
            onChange={(e) => setAddForm((f) => ({ ...f, stat_name: e.target.value }))}
            required
          />
          <input
            type="number"
            step="any"
            className={`${styles.input} ${styles.inputNarrow}`}
            placeholder="Multiplier"
            value={addForm.stat_multiplier}
            onChange={(e) => setAddForm((f) => ({ ...f, stat_multiplier: e.target.value }))}
            required
          />
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={addLoading || !addForm.stat_name.trim() || addForm.stat_multiplier === ""}
          >
            {addLoading ? "Adding…" : "Add Formula"}
          </button>
        </form>
        {addError && <p className={styles.errorText}>{addError}</p>}
      </div>

      {/* Formula List */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>All Formulas</h2>
        {error && <p className={styles.errorText}>{error}</p>}
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : formulas.length === 0 ? (
          <p className={styles.muted}>No formulas found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Stat Name</th>
                <th>Multiplier</th>
                <th>Updated By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formulas.map((formula) => (
                <tr key={formula.id}>
                  <td>
                    {editId === formula.id ? (
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm.stat_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, stat_name: e.target.value }))}
                        required
                        autoFocus
                      />
                    ) : (
                      formula.stat_name
                    )}
                  </td>
                  <td>
                    {editId === formula.id ? (
                      <input
                        type="number"
                        step="any"
                        className={`${styles.input} ${styles.inputNarrow}`}
                        value={editForm.stat_multiplier}
                        onChange={(e) => setEditForm((f) => ({ ...f, stat_multiplier: e.target.value }))}
                        required
                      />
                    ) : (
                      formula.stat_multiplier
                    )}
                  </td>
                  <td className={styles.mutedCell}>{formula.updated_by_name || "—"}</td>
                  <td>
                    {editId === formula.id ? (
                      <form onSubmit={handleUpdate}>
                        {editError && <p className={styles.errorText}>{editError}</p>}
                        <div className={styles.actions}>
                          <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={editLoading || !editForm.stat_name.trim() || editForm.stat_multiplier === ""}
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
                        <button className={styles.btnEdit} onClick={() => startEdit(formula)}>
                          Edit
                        </button>
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(formula.id)}
                          disabled={deleteLoading && deleteId === formula.id}
                        >
                          {deleteLoading && deleteId === formula.id ? "Deleting…" : "Delete"}
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
