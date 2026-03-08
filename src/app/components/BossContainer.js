"use client";

import BossCard from "./BossCard";

export default function BossContainer({ bosses = [] }) {
  return (
    <div className="card-grid">
      {bosses.map((boss, index) => (
        <BossCard key={index} boss={boss} />
      ))}
    </div>
  );
}