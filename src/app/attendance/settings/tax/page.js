"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { ConfirmModal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";

export default function TaxSettingsPage() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addName, setAddName] = useState("");
  const [addPercent, setAddPercent] = useState("");
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPercent, setEditPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTaxes(await apiFetch("/api/loan-taxes"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      await apiFetch("/api/loan-taxes", { method: "POST", body: { name: addName.trim(), percent: Number(addPercent) } });
      setAddName("");
      setAddPercent("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(tax) {
    setEditId(tax.id);
    setEditName(tax.name);
    setEditPercent(String(tax.percent));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/loan-taxes/${editId}`, { method: "PUT", body: { name: editName.trim(), percent: Number(editPercent) } });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/loan-taxes/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Tax Settings</h1>
          <p className={ui.subtitle}>Taxes that can be applied to loans</p>
        </div>
      </div>

      <div className={ui.card}>
        <h2 className={ui.sectionTitle} style={{ marginBottom: 6 }}>Taxes</h2>
        <p className={ui.muted} style={{ marginBottom: 16 }}>
          Taxes are applied one after another, in the order below (100,000 → −8% = 92,000 → −5% = 87,400). Each loan chooses which taxes it uses and keeps its own copy of the name and percent, so changing or deleting a tax here never changes existing loans.
        </p>

        <form onSubmit={handleAdd} className={ui.inlineForm} style={{ marginBottom: 16 }}>
          <div className={ui.field} style={{ flex: 1, minWidth: 180 }}>
            <label className={ui.label} htmlFor="tax-add-name">Tax name</label>
            <input id="tax-add-name" className={ui.input} value={addName} onChange={(e) => setAddName(e.target.value)} maxLength={60} placeholder="e.g. Market tax" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="tax-add-percent">Percent (%)</label>
            <input id="tax-add-percent" type="number" min="0" max="100" step="0.01" className={ui.input} style={{ width: 120 }} value={addPercent} onChange={(e) => setAddPercent(e.target.value)} required />
          </div>
          <button type="submit" className={ui.btnPrimary} disabled={adding || !addName.trim() || addPercent === ""}>
            {adding ? "Adding…" : "Add tax"}
          </button>
        </form>

        {error && <div className={ui.banner}>{error}</div>}

        {loading ? (
          <p className={ui.muted}>Loading…</p>
        ) : taxes.length === 0 ? (
          <p className={ui.muted}>No taxes yet.</p>
        ) : (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr><th>Order</th><th>Name</th><th>Percent</th><th>Updated by</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {taxes.map((tax, i) =>
                  editId === tax.id ? (
                    <tr key={tax.id}>
                      <td colSpan={5}>
                        <form onSubmit={handleSave} className={ui.inlineForm}>
                          <input className={`${ui.input} ${ui.inputSm}`} style={{ flex: 1, minWidth: 160 }} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} required autoFocus aria-label="Tax name" />
                          <input type="number" min="0" max="100" step="0.01" className={`${ui.input} ${ui.inputSm}`} style={{ width: 110 }} value={editPercent} onChange={(e) => setEditPercent(e.target.value)} required aria-label="Percent" />
                          <button type="submit" className={`${ui.btnPrimary} ${ui.btnSm}`} disabled={saving || !editName.trim() || editPercent === ""}>{saving ? "Saving…" : "Save"}</button>
                          <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setEditId(null)} disabled={saving}>Cancel</button>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={tax.id}>
                      <td>{i + 1}</td>
                      <td>{tax.name}</td>
                      <td>{tax.percent}%</td>
                      <td className={ui.mutedCell}>{tax.updated_by_name || "—"}</td>
                      <td>
                        <div className={ui.actions}>
                          <button className={ui.btnEdit} onClick={() => startEdit(tax)}>Edit</button>
                          <button className={ui.btnDelete} onClick={() => setDeleteTarget(tax)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete tax?"
          message={`"${deleteTarget.name}" will no longer be offered for new loans. Loans that already use it keep it.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
