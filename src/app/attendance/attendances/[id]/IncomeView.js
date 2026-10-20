"use client";

import { useState } from "react";
import { applyTaxChain, formatDiamonds } from "@/lib/money";
import { Modal, ConfirmModal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import styles from "./income-view.module.css";
import IncomeImportModal from "./IncomeImportModal";

export const taxLabel = (item) =>
  item.taxes.length === 0 ? "No tax" : item.taxes.map((t) => `${t.name} ${t.percent}%`).join(" + ");

// Income sources of an attendance. Without `editor` it is a read-only view (member portal).
// editor = { taxes, onCreate(body), onUpdate(id, body), onDelete(id) }; each handler returns a promise and throws on failure.
export default function IncomeView({ income, editor }) {
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const items = income?.items ?? [];

  async function remove(item) {
    setBusy(true);
    setError("");
    try {
      await editor.onDelete(item.id);
      setModal(null);
    } catch (err) {
      setError(err.message);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={ui.card}>
        <div className={ui.stats} style={{ margin: 0 }}>
          <div className={ui.stat}><span>Total diamonds (after tax)</span><b>{formatDiamonds(income?.total_after_tax ?? 0)} 💎</b></div>
          <div className={ui.stat}><span>Original amount</span><b>{formatDiamonds(income?.total_amount ?? 0)}</b></div>
          <div className={ui.stat}><span>Total tax</span><b>{formatDiamonds((income?.total_amount ?? 0) - (income?.total_after_tax ?? 0))}</b></div>
        </div>
      </div>

      <div className={ui.card}>
        <div className={styles.head}>
          <h2 className={ui.sectionTitle} style={{ margin: 0 }}>Income sources</h2>
          {editor && (
            <div className={styles.headActions}>
              <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "import" })}>📷 Import from screenshot</button>
              <button className={`${ui.btnPrimary} ${ui.btnSm}`} onClick={() => setModal({ type: "form", item: null })}>+ Add income</button>
            </div>
          )}
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
        {items.length === 0 ? (
          <p className={ui.muted}>No income recorded yet.</p>
        ) : (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th className={ui.num}>Amount</th>
                  <th>Applied tax</th>
                  <th className={ui.num}>After tax</th>
                  {editor && <th />}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td><b>{item.name}</b></td>
                    <td className={ui.num}>{formatDiamonds(item.amount)}</td>
                    <td>{taxLabel(item)}</td>
                    <td className={ui.num}><b>{formatDiamonds(item.after_tax)}</b> 💎</td>
                    {editor && (
                      <td className={ui.num}>
                        <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "form", item })}>Edit</button>{" "}
                        <button className={`${ui.btnDelete} ${ui.btnSm}`} onClick={() => setModal({ type: "delete", item })}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total</td>
                  <td className={ui.num}>{formatDiamonds(income.total_amount)}</td>
                  <td />
                  <td className={ui.num}>{formatDiamonds(income.total_after_tax)} 💎</td>
                  {editor && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className={ui.hint}>
          After tax applies the chosen taxes one after another to the original amount.
          {editor && " Copy the total into a Salary tab with “Copy from Income”."}
        </p>
      </div>

      {editor && modal?.type === "form" && (
        <IncomeFormModal
          item={modal.item}
          taxes={editor.taxes}
          onClose={() => setModal(null)}
          onSubmit={async (body) => {
            if (modal.item) await editor.onUpdate(modal.item.id, body);
            else await editor.onCreate(body);
            setModal(null);
          }}
        />
      )}
      {editor && modal?.type === "import" && (
        <IncomeImportModal taxes={editor.taxes} onCreate={editor.onCreate} onClose={() => setModal(null)} />
      )}
      {editor && modal?.type === "delete" && (
        <ConfirmModal
          title="Delete this income?"
          message={`"${modal.item.name}" is removed from the income total. Salaries already saved are not changed.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={() => remove(modal.item)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function IncomeFormModal({ item, taxes, onClose, onSubmit }) {
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  // null = keep the item's saved taxes untouched (edit mode); an array = the admin changed the selection.
  const [taxIds, setTaxIds] = useState(item ? null : taxes.map((t) => t.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const savedIds = item ? item.taxes.map((t) => t.tax_id) : [];
  const isChecked = (tax) => (taxIds ? taxIds.includes(tax.id) : savedIds.includes(tax.id));
  function toggleTax(tax) {
    const current = taxIds ?? taxes.filter((t) => savedIds.includes(t.id)).map((t) => t.id);
    setTaxIds(current.includes(tax.id) ? current.filter((id) => id !== tax.id) : [...current, tax.id]);
  }

  const amountNumber = Number(amount);
  const amountValid = /^\d+$/.test(amount.trim());
  const previewTaxes = taxIds ? taxes.filter((t) => taxIds.includes(t.id)) : item.taxes;
  const chain = amountValid ? applyTaxChain(amountNumber, previewTaxes) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = { name: name.trim(), amount: amountNumber };
    if (taxIds) body.tax_ids = taxIds;
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={item ? "Edit income" : "Add income"}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="income-form" className={ui.btnPrimary} disabled={saving || !name.trim() || !amountValid}>
            {saving ? "Saving…" : item ? "Save" : "Add"}
          </button>
        </>
      }
    >
      <form id="income-form" onSubmit={handleSubmit}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="income-name">Name</label>
          <input id="income-name" className={ui.input} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="e.g. Castle Dion" autoFocus required />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="income-amount">Amount (original, before tax)</label>
          <input id="income-amount" type="number" min="0" step="1" className={ui.input} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className={ui.field}>
          <span className={ui.label}>Taxes applied</span>
          {taxes.length === 0 ? (
            <p className={ui.muted}>No taxes configured. Add them in Settings → Tax Settings.</p>
          ) : (
            taxes.map((tax) => (
              <label key={tax.id} className={styles.checkRow}>
                <input type="checkbox" checked={isChecked(tax)} onChange={() => toggleTax(tax)} />
                {tax.name} ({tax.percent}%)
              </label>
            ))
          )}
        </div>
        <div className={styles.preview}>
          {chain ? (
            <>
              <div className={styles.taxRow}><span>Original</span><b>{formatDiamonds(amountNumber)}</b></div>
              {chain.steps.map((step, i) => (
                <div key={i} className={styles.taxRow}><span>− {step.name} {step.percent}%</span><span>−{formatDiamonds(step.amount)} → {formatDiamonds(step.after)}</span></div>
              ))}
              <div className={styles.taxRow}><b>After tax</b><b>{formatDiamonds(chain.net)}</b></div>
            </>
          ) : (
            <span className={ui.muted}>Enter an amount to see the tax breakdown.</span>
          )}
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}
