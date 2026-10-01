"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import AltServerNavbar from "./AltServerNavbar";
import Footer from "./footer";
import PinGate from "./PinGate";

const BARE_ROUTES = ["/attendance", "/users", "/leaderboard"];

export default function LayoutShell({ children }) {
  const pathname = usePathname() || "/";
  const isBare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const PageNavbar = pathname === "/alt-server" ? AltServerNavbar : Navbar;

  if (isBare) return <>{children}</>;

  return (
    <PinGate>
      <PageNavbar />
      {children}
      <Footer />
    </PinGate>
  );
}
