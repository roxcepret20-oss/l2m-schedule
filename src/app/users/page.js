"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const realIgn = localStorage.getItem("user_real_ign");
    if (realIgn) {
      router.replace(`/users/${encodeURIComponent(realIgn)}`);
    } else {
      router.replace("/users/login");
    }
  }, [router]);

  return null;
}
