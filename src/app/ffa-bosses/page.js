import BossContainer from "../components/BossContainer";
import { fetchBossContents } from "@/services/boss.service";
import { ffaBossList } from "../Helper/BossVariables";

export default async function FFABosses() {
  const bosses = await fetchBossContents();
  const filteredBosses = bosses.filter(b => ffaBossList.includes(b.name));
  return (
    <div>
      <div className="page-title">FFA Boss Schedule</div>
      <BossContainer bosses={filteredBosses} />
    </div>
  );
}