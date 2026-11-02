"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { applyTaxChain, formatDiamonds } from "@/lib/money";
import { formatShortDate, todayIso } from "@/lib/weeks";
import { Modal } from "../components/Modal";
import ui from "../components/attendance-ui.module.css";
import styles from "./clan-savings.module.css";

const isPositiveInt = (text) => /^\d+$/.test(text.trim()) && Number(text) > 0;

function MemberSelect({ id, members, value, onChange, required = true, emptyLabel = "Select member…" }) {
  return (
    <select id={id} className={ui.select} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">{emptyLabel}</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>{m.ign}</option>
      ))}
    </select>
  );
}

function useSubmit(run) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e?.preventDefault();
    setSaving(true);
    setError("");
    try {
      await run();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }
  return { saving, error, submit };
}

// A deposit: a member puts diamonds into the clan savings. Taxes (Settings → Tax) are optional and ticked per saving.
export function SavingFormModal({ saving: record, clan, members, taxes, onClose, onSaved }) {
  const [date, setDate] = useState(record?.saving_date ?? todayIso());
  const [memberId, setMemberId] = useState(record ? String(record.member.id) : "");
  const [amount, setAmount] = useState(record ? String(record.amount) : "");
  const [note, setNote] = useState(record?.note ?? "");
  // null = keep the saving's saved taxes untouched (edit mode); an array = the admin changed the selection.
  const [taxIds, setTaxIds] = useState(record ? null : []);

  const options = record && !members.some((m) => m.id === record.member.id) ? [{ id: record.member.id, ign: record.member.ign }, ...members] : members;
  const amountNumber = Number(amount);
  const amountValid = isPositiveInt(amount);
  const valid = date && memberId && amountValid;

  const savedIds = record ? record.taxes.map((t) => t.tax_id) : [];
  const isChecked = (tax) => (taxIds ? taxIds.includes(tax.id) : savedIds.includes(tax.id));
  function toggleTax(tax) {
    const current = taxIds ?? taxes.filter((t) => savedIds.includes(t.id)).map((t) => t.id);
    setTaxIds(current.includes(tax.id) ? current.filter((id) => id !== tax.id) : [...current, tax.id]);
  }
  const previewTaxes = taxIds ? taxes.filter((t) => taxIds.includes(t.id)) : record?.taxes ?? [];
  const chain = amountValid ? applyTaxChain(amountNumber, previewTaxes) : null;

  const { saving, error, submit } = useSubmit(async () => {
    const body = { saving_date: date, member_id: Number(memberId), amount: amountNumber, note: note.trim() || null };
    if (taxIds) body.tax_ids = taxIds;
    if (record) await apiFetch(`/api/clan-savings/${record.id}`, { method: "PUT", body });
    else await apiFetch("/api/clan-savings", { method: "POST", body: { ...body, clan_id: clan.id } });
    onSaved();
  });

  return (
    <Modal
      title={record ? "Edit saving" : `New saving – ${clan.name}`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="saving-form" className={ui.btnPrimary} disabled={saving || !valid}>{saving ? "Saving…" : record ? "Save" : "Add saving"}</button>
        </>
      }
    >
      <form id="saving-form" onSubmit={submit}>
        <div className={ui.formRow}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="saving-date">Saving date</label>
            <input id="saving-date" type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="saving-member">Member (savings are in this member)</label>
            <MemberSelect id="saving-member" members={options} value={memberId} onChange={setMemberId} />
          </div>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="saving-amount">Amount (diamonds)</label>
          <input id="saving-amount" type="number" min="1" step="1" className={ui.input} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className={ui.field}>
          <span className={ui.label}>Taxes (optional – tick the ones that apply)</span>
          {taxes.length === 0 ? (
            <p className={ui.muted}>No taxes configured. Add them in Settings → Tax Settings.</p>
          ) : (
            taxes.map((tax) => (
              <label key={tax.id} className={styles.checkRow}>
                <input type="checkbox" checked={isChecked(tax)} onChange={() => toggleTax(tax)} />
                {tax.name} tax ({tax.percent}%)
              </label>
            ))
          )}
        </div>
        <div className={styles.preview}>
          {chain ? (
            <>
              <div className={styles.taxRow}><span>Amount</span><b>{formatDiamonds(amountNumber)}</b></div>
              {chain.steps.map((step, i) => (
                <div key={i} className={styles.taxRow}><span>− {step.name} {step.percent}%</span><span>−{formatDiamonds(step.amount)} → {formatDiamonds(step.after)}</span></div>
              ))}
              <div className={styles.taxRow}><b>Added to clan savings</b><b>{formatDiamonds(chain.net)}</b></div>
            </>
          ) : (
            <span className={ui.muted}>Enter an amount to see what is added to the clan savings.</span>
          )}
        </div>
        <div className={ui.field} style={{ marginTop: 14 }}>
          <label className={ui.label} htmlFor="saving-note">Notes (optional)</label>
          <input id="saving-note" className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Boss drop sale, week 3" />
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}

// Withdraw savings to buy an item (item = null) or edit one. A new item can be assigned to a member right away.
export function ItemFormModal({ item, clan, members, balance, onClose, onSaved }) {
  const [name, setName] = useState(item?.name ?? "");
  const [cost, setCost] = useState(item ? String(item.cost) : "");
  const [date, setDate] = useState(item?.purchased_at ?? todayIso());
  const [memberId, setMemberId] = useState("");
  const [note, setNote] = useState(item?.note ?? "");

  // When editing, the item's own cost is already deducted from the balance.
  const available = item ? balance + item.cost : balance;
  const costNumber = Number(cost);
  const costValid = isPositiveInt(cost);
  const tooMuch = costValid && costNumber > available;
  const valid = name.trim() && date && costValid && !tooMuch;

  const { saving, error, submit } = useSubmit(async () => {
    const body = { name: name.trim(), cost: costNumber, purchased_at: date, note: note.trim() || null };
    if (item) await apiFetch(`/api/clan-savings/items/${item.id}`, { method: "PUT", body });
    else await apiFetch("/api/clan-savings/items", { method: "POST", body: { ...body, clan_id: clan.id, member_id: memberId ? Number(memberId) : null } });
    onSaved();
  });

  return (
    <Modal
      title={item ? "Edit item" : `Withdraw savings – ${clan.name}`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="item-form" className={ui.btnPrimary} disabled={saving || !valid}>{saving ? "Saving…" : item ? "Save" : "Withdraw & add item"}</button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit}>
        <p className={ui.hint} style={{ marginTop: 0 }}>Available in clan savings: <b>{formatDiamonds(available)} 💎</b></p>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="item-name">Item bought</label>
          <input id="item-name" className={ui.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Sword of Valakas" autoFocus required />
        </div>
        <div className={ui.formRow}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="item-cost">Cost withdrawn (diamonds)</label>
            <input id="item-cost" type="number" min="1" step="1" className={ui.input} value={cost} onChange={(e) => setCost(e.target.value)} required />
            {tooMuch && <p className={ui.errorText}>More than the available savings.</p>}
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="item-date">Purchase date</label>
            <input id="item-date" type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        {!item && (
          <div className={ui.field}>
            <label className={ui.label} htmlFor="item-member">Assign to member (optional)</label>
            <MemberSelect id="item-member" members={members} value={memberId} onChange={setMemberId} required={false} emptyLabel="Free (not assigned)" />
          </div>
        )}
        <div className={ui.field}>
          <label className={ui.label} htmlFor="item-note">Notes (optional)</label>
          <input id="item-note" className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}

export function AssignModal({ item, members, onClose, onSaved }) {
  const [memberId, setMemberId] = useState("");
  const [note, setNote] = useState("");
  const options = useMemo(() => members.filter((m) => m.id !== item.assigned_member?.id), [members, item]);

  const { saving, error, submit } = useSubmit(async () => {
    await apiFetch(`/api/clan-savings/items/${item.id}/assign`, { method: "POST", body: { member_id: Number(memberId), note: note.trim() || null } });
    onSaved();
  });

  return (
    <Modal
      title={`${item.assigned_member ? "Reassign" : "Assign"} ${item.name}`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="assign-form" className={ui.btnPrimary} disabled={saving || !memberId}>{saving ? "Saving…" : "Assign"}</button>
        </>
      }
    >
      <form id="assign-form" onSubmit={submit}>
        {item.assigned_member && <p className={ui.hint} style={{ marginTop: 0 }}>Currently assigned for {item.assigned_member.ign}.</p>}
        <div className={ui.field}>
          <label className={ui.label} htmlFor="assign-member">Member who holds the item</label>
          <MemberSelect id="assign-member" members={options} value={memberId} onChange={setMemberId} />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="assign-note">Notes (optional)</label>
          <input id="assign-note" className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}

// Release (note only) and Sell (date + note) share the same small form.
export function ItemActionModal({ item, action, onClose, onSaved }) {
  const selling = action === "sell";
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");

  const { saving, error, submit } = useSubmit(async () => {
    const body = { note: note.trim() || null, ...(selling ? { sold_at: date } : {}) };
    await apiFetch(`/api/clan-savings/items/${item.id}/${action}`, { method: "POST", body });
    onSaved();
  });

  return (
    <Modal
      title={selling ? `Sell ${item.name}` : `Release ${item.name}`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="item-action-form" className={selling ? ui.btnDanger : ui.btnPrimary} disabled={saving || (selling && !date)}>
            {saving ? "Saving…" : selling ? "Mark as sold" : "Release (make Free)"}
          </button>
        </>
      }
    >
      <form id="item-action-form" onSubmit={submit}>
        <p className={ui.hint} style={{ marginTop: 0 }}>
          {selling
            ? "The item is no longer in the clan. The sale does not change the savings balance."
            : `Takes the item back from ${item.assigned_member?.ign ?? "the member"}; its status becomes Free.`}
        </p>
        {selling && (
          <div className={ui.field}>
            <label className={ui.label} htmlFor="sold-date">Sold date</label>
            <input id="sold-date" type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        )}
        <div className={ui.field}>
          <label className={ui.label} htmlFor="action-note">Notes (optional)</label>
          <input id="action-note" className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={selling ? "e.g. Sold in market for 800" : "e.g. Member left the clan"} />
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}

const ACTION_LABELS = { buy: "Bought", assign: "Assigned", release: "Released", sold: "Sold" };

export function HistoryModal({ item, onClose }) {
  return (
    <Modal title={`History – ${item.name}`} onClose={onClose} footer={<button type="button" className={ui.btnGhost} onClick={onClose}>Close</button>}>
      <ul className={styles.history}>
        {item.history.map((h, i) => (
          <li key={i}>
            <b>{ACTION_LABELS[h.action] ?? h.action}</b>
            {h.member && <> · {h.member.ign}</>}
            <span className={styles.historyWhen}>{formatShortDate(h.at.slice(0, 10))}{h.by ? ` · ${h.by}` : ""}</span>
            {h.note && <div className={styles.historyNote}>{h.note}</div>}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
