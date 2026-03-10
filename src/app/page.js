"use client";

import { useEffect, useState } from "react";
import BossContainer from "./components/BossContainer";
import Loader from "./components/ClientSideLoader";

export default function Bosses() {
  const [bosses, setBosses] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/bosses")
      .then(res => res.json())
      .then(data => { if (mounted) setBosses(data); })
      .catch(()=>{});
    console.log("bosses", bosses);
    return () => { mounted = false; };
  }, []);

  if (!bosses) return (
    <Loader />
  );

  return (
    <div>
      <div className="page-title">All Boss Schedule</div>
      <BossContainer bosses={bosses} />
    </div>
  );
}