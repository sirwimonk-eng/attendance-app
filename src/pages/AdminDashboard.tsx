import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { DashboardResponse, Status, Role } from "../types";
import StatusBadge from "../components/StatusBadge";

const STATUS_OPTIONS: Status[] = ["มา", "สาย", "ขาด", "ลา"];
const ROLE_OPTIONS: Role[] = ["ข้าราชการ", "เจ้าหน้าที่ธุรการ", "ผู้บังคับบัญชา"];

const STAT_CARDS: { key: keyof DashboardResponse["stats"]; label: string; accent: string }[] = [
  { key: "totalPersonnel", label: "กำลังพลทั้งหมด", accent: "text-ink" },
  { key: "presentCount", label: "มาแถว", accent: "text-signal-green" },
  { key: "lateCount", label: "มาสาย", accent: "text-signal-amber" },
  { key: "absentCount", label: "ขาด", accent: "text-signal-red" },
  { key: "leaveCount", label: "ลา", accent: "text-olive-600" },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    try {
      const res = await api.dashboard();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`ยืนยันลบข้อมูลกำลังพล "${name}" ออกจากระบบ?`)) return;
    setBusyId(id);
    try {
      await api.deletePersonnel(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatus(id: number, status: Status) {
    setBusyId(id);
    try {
      let leaveReason: string | undefined;
      if (status === "ลา") {
        leaveReason = prompt("ระบุเหตุผลการลา (ถ้ามี):") || undefined;
      }
      await api.setStatus(id, status, leaveReason);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-olive-400">แผงควบคุมกองบังคับการ</p>
          <h1 className="font-display text-2xl font-semibold text-ink">ภาพรวมการเข้าแถวประจำวัน</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-olive-700 px-4 py-2 text-sm font-medium text-paper transition hover:bg-olive-600"
        >
          + เพิ่มกำลังพล
        </button>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm text-signal-red">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STAT_CARDS.map((c) => (
              <div key={c.key} className="rounded-xl border border-olive-700/20 bg-olive-900/5 p-4">
                <div className={`font-mono text-2xl font-semibold ${c.accent}`}>{data.stats[c.key]}</div>
                <div className="mt-1 text-xs text-olive-500">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-olive-700/20">
              <div className="border-b border-olive-700/20 px-4 py-3">
                <h2 className="font-mono text-xs uppercase tracking-widest text-olive-500">รายชื่อกำลังพล</h2>
              </div>
              <div className="divide-y divide-olive-700/10">
                {data.personnel.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-[10rem] flex-1">
                      <div className="text-sm font-medium text-ink">
                        {p.rank} {p.name}
                      </div>
                      <div className="font-mono text-xs text-olive-400">
                        @{p.username} {p.isFaceRegistered ? "· ลงทะเบียนใบหน้าแล้ว" : "· ยังไม่ลงทะเบียนใบหน้า"}
                        {p.leaveReason ? ` · ${p.leaveReason}` : ""}
                      </div>
                    </div>
                    <select
                      value={p.status}
                      disabled={busyId === p.id}
                      onChange={(e) => handleStatus(p.id, e.target.value as Status)}
                      className="rounded-md border border-olive-700/30 bg-transparent px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <StatusBadge status={p.status} />
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={busyId === p.id}
                      className="rounded-md border border-signal-red/30 px-2 py-1 text-xs text-signal-red transition hover:bg-signal-red/10 disabled:opacity-50"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
                {data.personnel.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-olive-400">ยังไม่มีกำลังพลในระบบ</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-olive-700/20">
              <div className="border-b border-olive-700/20 px-4 py-3">
                <h2 className="font-mono text-xs uppercase tracking-widest text-olive-500">บันทึกล่าสุด</h2>
              </div>
              <div className="max-h-[560px] divide-y divide-olive-700/10 overflow-y-auto">
                {data.recentLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">
                        {log.rank} {log.name}
                      </span>
                      <span className="font-mono text-xs text-olive-400">{log.time}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-olive-500">
                      <span>{log.type === "checkin" ? "เข้าแถว" : "ออกแถว"}</span>
                      <span>·</span>
                      <span>ห่างจุดรวมพล {log.distance} ม.</span>
                      <StatusBadge status={log.status} />
                    </div>
                  </div>
                ))}
                {data.recentLogs.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-olive-400">ยังไม่มีบันทึกการลงเวลา</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {showAdd && <AddPersonnelModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}

function AddPersonnelModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ username: "", password: "", name: "", rank: "", role: "ข้าราชการ" as Role });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.addPersonnel(form);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-950/60 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-olive-700/30 bg-paper p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-ink">เพิ่มกำลังพลใหม่</h3>

        {(["name", "rank", "username", "password"] as const).map((field) => (
          <div key={field} className="mb-3">
            <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-olive-500">
              {{ name: "ชื่อ-สกุล", rank: "ยศ", username: "ชื่อผู้ใช้", password: "รหัสผ่าน" }[field]}
            </label>
            <input
              required
              type={field === "password" ? "password" : "text"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full rounded-lg border border-olive-700/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-brass-400"
            />
          </div>
        ))}

        <div className="mb-4">
          <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-olive-500">ตำแหน่งสิทธิ์</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="w-full rounded-lg border border-olive-700/30 bg-transparent px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-3 text-sm text-signal-red">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-olive-700/30 py-2 text-sm">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-olive-700 py-2 text-sm font-medium text-paper disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}
