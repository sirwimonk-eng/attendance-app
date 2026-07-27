import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { AuthUser } from "../types";

export default function LoginPage({ onLogin }: { onLogin: (user: AuthUser, token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username.trim(), password);
      onLogin(res.user, res.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid-topo relative flex min-h-screen items-center justify-center bg-olive-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-olive-950/40 to-olive-950" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-brass-400/60 text-brass-300">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-semibold text-paper">ระบบลงเวลาแถวกำลังพล</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-olive-400">
            Personnel Roll-Call &amp; Attendance System
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-olive-700 bg-olive-900/80 p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.2)] backdrop-blur"
        >
          <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-olive-400">
            ชื่อผู้ใช้
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            className="mb-4 w-full rounded-lg border border-olive-600 bg-olive-950 px-3 py-2.5 text-paper outline-none placeholder:text-olive-400 focus:border-brass-400"
            placeholder="เช่น commander"
          />

          <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-olive-400">
            รหัสผ่าน
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-5 w-full rounded-lg border border-olive-600 bg-olive-950 px-3 py-2.5 text-paper outline-none placeholder:text-olive-400 focus:border-brass-400"
            placeholder="••••••••"
          />

          {error && (
            <div className="mb-4 rounded-lg border border-signal-red/40 bg-signal-red/10 px-3 py-2 text-sm text-signal-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brass-500 py-2.5 font-medium text-olive-950 transition hover:bg-brass-400 disabled:opacity-60"
          >
            {loading ? "กำลังตรวจสอบสิทธิ์..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-5 text-center font-mono text-[11px] text-olive-400">
          ระบบยืนยันตัวตนด้วยพิกัด GPS และใบหน้า · จำกัดเฉพาะกำลังพลที่ลงทะเบียน
        </p>
      </div>
    </div>
  );
}
