"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./components/Sidebar";
import { DashboardNavbar } from "./dashboard/DashboardNavbar";
import styles from "./dashboard/dashboard.module.css";

export default function AttendanceLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isLogin = pathname === "/attendance/login";
  const isPublicMemberDetail = /^\/attendance\/members\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (isLogin || isPublicMemberDetail) {
      setChecked(true);
      return;
    }
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/attendance/login");
    } else {
      setChecked(true);
    }
  }, [router, isLogin, isPublicMemberDetail]);

  if (!checked) return null;

  if (isLogin || isPublicMemberDetail) return <>{children}</>;

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
