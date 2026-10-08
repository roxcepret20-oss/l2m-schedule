export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Calls the attendance API with the admin token. Throws ApiError with the server's message on failure.
export async function apiFetch(path, { method = "GET", body } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
    localStorage.removeItem("auth_token");
    window.location.replace("/attendance/login");
  }

  if (!res.ok) {
    throw new ApiError(data?.message || "Something went wrong.", res.status);
  }
  return data;
}
