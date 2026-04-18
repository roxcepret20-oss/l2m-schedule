"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { DashboardNavbar } from "./DashboardNavbar";
import styles from "./dashboard.module.css";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <DashboardNavbar />
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
