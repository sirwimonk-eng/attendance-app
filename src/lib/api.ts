import type { AuthUser, DashboardResponse } from "../types";

class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.message || `คำขอล้มเหลว (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ success: true; message: string; token: string; user: AuthUser }>("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  dashboard: () => request<DashboardResponse>("/dashboard"),

  checkin: (payload: { userId: number; latitude: number; longitude: number; faceDescriptor?: number[] }) =>
    request<{ success: true; message: string; log: any }>("/checkin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkout: (payload: { userId: number; latitude: number; longitude: number; faceDescriptor?: number[] }) =>
    request<{ success: true; message: string; log: any }>("/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  registerFace: (userId: number, descriptor: number[]) =>
    request<{ success: true; message: string }>("/face/register", {
      method: "POST",
      body: JSON.stringify({ userId, descriptor }),
    }),

  addPersonnel: (payload: { username: string; password: string; name: string; rank: string; role: string }) =>
    request<{ success: true; message: string; user: AuthUser }>("/personnel", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deletePersonnel: (id: number) =>
    request<{ success: true; message: string }>(`/personnel/${id}`, { method: "DELETE" }),

  setStatus: (userId: number, status: string, leaveReason?: string) =>
    request<{ success: true; message: string }>("/personnel/status", {
      method: "POST",
      body: JSON.stringify({ userId, status, leaveReason }),
    }),
};

export { ApiError };
