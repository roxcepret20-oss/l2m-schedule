"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import AltServerNavbar from "./AltServerNavbar";
import FarmServerNavbar from "./FarmServerNavbar";
import Footer from "./footer";
import PinGate from "./PinGate";

const BARE_ROUTES = ["/attendance", "/users", "/leaderboard"];

export default function LayoutShell({ children }) {
  const pathname = usePathname() || "/";
  const isBare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isUnder = (base) => pathname === base || pathname.startsWith(base + "/");
  const PageNavbar = isUnder("/alt-server") ? AltServerNavbar : isUnder("/farm-server") ? FarmServerNavbar : Navbar;

  if (isBare) return <>{children}</>;

  return (
    <PinGate>
      <PageNavbar />
      {children}
      <Footer />
    </PinGate>
  );
}
