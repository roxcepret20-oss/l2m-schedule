"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function DashboardNavbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Generate a consistent avatar URL from stored username
  const seed = typeof window !== "undefined"
    ? localStorage.getItem("auth_user") || "user"
    : "user";
  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // proceed with local cleanup even if API call fails
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    router.push("/login");
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarTitle}>Dashboard</div>
      <div className={styles.topbarRight}>
        <ThemeToggle />
        <div className={styles.profileWrapper} ref={menuRef}>
          <button className={styles.profileBtn} onClick={() => setOpen((v) => !v)} aria-label="Profile menu">
            <img src={avatarUrl} alt="avatar" className={styles.avatar} width={34} height={34} />
          </button>
          {open && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
