"use client";

import Navbar from "./Navbar";

const FARM_NAV_OPTIONS = [
  { value: "card", label: "Card", href: "/farm-server" },
  { value: "pipeline", label: "Pipeline", href: "/farm-server/pipeline" },
];

export default function FarmServerNavbar() {
  return <Navbar logo="Farm Schedule" navOptions={FARM_NAV_OPTIONS} />;
}