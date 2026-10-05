"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function UsersAuthLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isPublic = pathname === "/users/login" || pathname === "/users/register";

  useEffect(() => {
    if (isPublic) {
      setChecked(true);
      return;
    }
    const token = localStorage.getItem("user_auth_token");
    if (!token) {
      router.replace("/users/login");
    } else {
      setChecked(true);
    }
  }, [router, isPublic]);

  if (!checked) return null;

  return <>{children}</>;
}
