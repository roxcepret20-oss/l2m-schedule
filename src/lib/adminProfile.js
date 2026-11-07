"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./attendanceApi";

let cache = { token: null, promise: null };

// Current admin ({ id, name, role, clan_id, clan_name }) from the API; cached per login token.
function loadAdminProfile() {
  const token = localStorage.getItem("auth_token");
  if (!cache.promise || cache.token !== token) {
    const promise = apiFetch("/api/auth/me").catch((err) => {
      if (cache.promise === promise) cache = { token: null, promise: null };
      throw err;
    });
    cache = { token, promise };
  }
  return cache.promise;
}

// Returns undefined while loading, null if the profile could not be loaded, otherwise the profile.
export function useAdminProfile() {
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let active = true;
    loadAdminProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null));
    return () => {
      active = false;
    };
  }, []);

  return profile;
}

export const isClanAdmin = (profile) => profile?.role === "clan_admin";
