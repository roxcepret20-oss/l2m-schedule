"use client";

import { useState } from "react";
import { Modal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import styles from "./attendance-detail.module.css";

// Bottom sheet: copy the ticked members of `source` onto the other bosses of its time group.
// Only adds ticks; existing ticks on the targets are kept. Admins can uncheck bosses they do not want.
export default function CopyTicksSheet({ source, targets, gapMinutes, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(targets.map((t) => t.id)));
  const count = source.member_ids.length;
  const picked = targets.filter((t) => selected.has(t.id));

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      sheet
      title={`Copy ticks from ${source.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose}>Cancel</button>
          <button type="button" className={ui.btnPrimary} disabled={picked.length === 0 || count === 0} onClick={() => onConfirm(picked)}>
            Copy to {picked.length} {picked.length === 1 ? "boss" : "bosses"}
          </button>
        </>
      }
    >
      <p className={ui.muted} style={{ marginBottom: 12 }}>
        {count === 0
          ? `${source.name} has no ticks to copy yet.`
          : `${count} ticked ${count === 1 ? "member" : "members"} from ${source.name} (${source.time}) will be ticked on the bosses you leave checked. Existing ticks are kept.`}
        {" "}Bosses are grouped when their times are within {gapMinutes} min of each other.
      </p>
      <ul className={styles.copyList}>
        {targets.map((t) => (
          <li key={t.id}>
            <label className={styles.copyItem}>
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
              <span className={styles.copyName}>{t.name}</span>
              <span className={styles.copyMeta}>{t.time} · {t.points}p · {t.member_ids.length} ticked</span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
