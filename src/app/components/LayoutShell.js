"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./footer";
import PinGate from "./PinGate";

const BARE_ROUTES = ["/login", "/dashboard"];

export default function LayoutShell({ children }) {
  const pathname = usePathname() || "/";
  const isBare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (isBare) return <>{children}</>;

  return (
    <PinGate>
      <Navbar />
      {children}
      <Footer />
    </PinGate>
  );
}
