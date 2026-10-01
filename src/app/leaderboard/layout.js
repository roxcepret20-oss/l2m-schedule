"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardLayout({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("user_auth_token");
    if (!token) {
      router.replace("/users/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
