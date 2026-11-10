"use client";

import Navbar from "./Navbar";

const E6_NAV_OPTIONS = [
  { value: "card", label: "Card", href: "/server-e6" },
  { value: "pipeline", label: "Pipeline", href: "/server-e6/pipeline" },
];

export default function ServerE6Navbar() {
  return <Navbar logo="ServerE6 Schedule" navOptions={E6_NAV_OPTIONS} />;
}
