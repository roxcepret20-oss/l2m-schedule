import { API_BASE, ApiError } from "./attendanceApi";

// Read-only calls with the clan member's token. A 401 logs the member out.
export async function memberApiFetch(path) {
  const token = typeof window !== "undefined" ? localStorage.getItem("user_auth_token") : null;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError("Connection error. Please try again.", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("user_auth_token");
    localStorage.removeItem("user_real_ign");
    window.location.replace("/users/login");
  }

  if (!res.ok) throw new ApiError(data?.message || "Something went wrong.", res.status);
  return data;
}
