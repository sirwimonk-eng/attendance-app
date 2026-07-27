import { useEffect, useState } from "react";
import type { AuthUser } from "./types";
import LoginPage from "./pages/LoginPage";
import CheckInPage from "./pages/CheckInPage";
import AdminDashboard from "./pages/AdminDashboard";

const STORAGE_KEY = "attendance_session_v1";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const { user: savedUser } = JSON.parse(raw);
        setUser(savedUser);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  function handleLogin(loggedInUser: AuthUser, token: string) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: loggedInUser, token }));
    setUser(loggedInUser);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  if (!ready) return null;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  const isCommand = user.role === "ผู้บังคับบัญชา" || user.role === "เจ้าหน้าที่ธุรการ";

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-olive-700/20 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brass-500 text-brass-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z" />
              </svg>
            </div>
            <span className="font-display text-sm font-semibold text-ink">ระบบลงเวลาแถวกำลังพล</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-olive-500 sm:inline">
              {user.rank} {user.name} · {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-olive-700/30 px-3 py-1.5 text-xs font-medium text-olive-700 transition hover:bg-olive-700/10"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

      {isCommand ? (
        <AdminDashboard />
      ) : (
        <CheckInPage user={user} onStatusChange={(status) => setUser({ ...user, status })} />
      )}
    </div>
  );
}
