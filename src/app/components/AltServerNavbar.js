"use client";

import Navbar from "./Navbar";

const ALT_NAV_OPTIONS = [
  { value: "card", label: "Card", href: "/alt-server" },
  { value: "pipeline", label: "Pipeline", href: "/alt-server/pipeline" },
];

export default function AltServerNavbar() {
  return <Navbar logo="Alt Schedule" navOptions={ALT_NAV_OPTIONS} showProfile={false} />;
}