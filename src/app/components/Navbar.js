"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname() || "/";
  const links = [
    { href: "/", label: "All Bosses" },
    { href: "/ffa-bosses", label: "FFA Bosses" },
    { href: "/inputs", label: "Inputs" },
  ];

  return (
    <nav className="navbar">
      <div className="logo">Shatter Company</div>
      <div className="nav-items">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`navbar-menu ${pathname === l.href ? "active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
       <ThemeToggle />
    </nav>
  );
}