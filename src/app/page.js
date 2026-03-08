import BossContainer from "./components/BossContainer";
import { fetchBossContents } from "@/services/boss.service";

export default async function Bosses() {
  const bosses = await fetchBossContents();

  return (
    <div>
      <div className="page-title">Boss Spawn Dashboard</div>
      <BossContainer bosses={bosses} />
    </div>
  );
}