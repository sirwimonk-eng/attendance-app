import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { getDistanceInMeters, watchPosition, type Coords } from "../lib/geo";
import { extractDescriptorFromVideo } from "../lib/face";
import type { AuthUser, PersonnelRow } from "../types";
import CameraFrame from "../components/CameraFrame";
import RadarGeofence from "../components/RadarGeofence";
import StatusBadge from "../components/StatusBadge";

export default function CheckInPage({ user, onStatusChange }: { user: AuthUser; onStatusChange: (s: AuthUser["status"]) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [target, setTarget] = useState<{ latitude: number; longitude: number; allowedRadiusMeters: number } | null>(null);
  const [me, setMe] = useState<PersonnelRow | null>(null);
  const [busy, setBusy] = useState<"checkin" | "checkout" | "register" | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const stop = watchPosition(setCoords, setGeoError);
    refreshMe();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMe() {
    try {
      const dash = await api.dashboard();
      setTarget(dash.targetGps);
      setMe(dash.personnel.find((p) => p.username === user.username) || null);
    } catch {
      // dashboard may be admin-only in a hardened deployment; fail quietly here
    }
  }

  const distance =
    coords && target ? getDistanceInMeters(coords.latitude, coords.longitude, target.latitude, target.longitude) : null;

  async function captureDescriptor(): Promise<number[] | undefined> {
    if (!videoRef.current || videoRef.current.readyState < 2) return undefined;
    return extractDescriptorFromVideo(videoRef.current);
  }

  async function handleRegisterFace() {
    setBusy("register");
    setNotice(null);
    try {
      const descriptor = await captureDescriptor();
      if (!descriptor) throw new Error("กล้องยังไม่พร้อม กรุณารอสักครู่แล้วลองใหม่");
      const res = await api.registerFace(user.id, descriptor);
      setNotice({ kind: "ok", text: res.message });
      refreshMe();
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof ApiError || err instanceof Error ? err.message : "ลงทะเบียนใบหน้าไม่สำเร็จ" });
    } finally {
      setBusy(null);
    }
  }

  async function handleAction(kind: "checkin" | "checkout") {
    if (!coords) {
      setNotice({ kind: "err", text: "ยังไม่พบพิกัด GPS กรุณาอนุญาตการเข้าถึงตำแหน่ง" });
      return;
    }
    setBusy(kind);
    setNotice(null);
    try {
      const descriptor = await captureDescriptor();
      const payload = {
        userId: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        faceDescriptor: descriptor,
      };
      const res = kind === "checkin" ? await api.checkin(payload) : await api.checkout(payload);
      setNotice({ kind: "ok", text: res.message });
      if (res.log?.status) onStatusChange(res.log.status);
      refreshMe();
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof ApiError ? err.message : "ทำรายการไม่สำเร็จ" });
    } finally {
      setBusy(null);
    }
  }

  const inRange = distance !== null && target !== null && distance <= target.allowedRadiusMeters;
  const faceRegistered = me?.isFaceRegistered ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-olive-400">จุดรวมพล · Check-in</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {user.rank} {user.name}
          </h1>
        </div>
        <StatusBadge status={user.status} />
      </header>

      {notice && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "ok"
              ? "border-signal-green/40 bg-signal-green/10 text-signal-green"
              : "border-signal-red/40 bg-signal-red/10 text-signal-red"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-olive-700/30 bg-olive-900 p-5">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-olive-400">ยืนยันใบหน้า</h2>
          <CameraFrame ref={videoRef} active className="aspect-square w-full" />
          <button
            onClick={handleRegisterFace}
            disabled={busy !== null}
            className="mt-4 w-full rounded-lg border border-brass-400/50 py-2.5 text-sm font-medium text-brass-300 transition hover:bg-brass-400/10 disabled:opacity-50"
          >
            {faceRegistered ? "ลงทะเบียนใบหน้าใหม่" : "ลงทะเบียนใบหน้า (ครั้งแรก)"}
          </button>
          {!faceRegistered && (
            <p className="mt-2 text-center text-xs text-signal-amber">
              ยังไม่ได้ลงทะเบียนใบหน้า — กรุณาลงทะเบียนก่อนลงชื่อเข้าแถว
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-olive-700/30 bg-paper-dim p-5">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-olive-600">ตำแหน่งเทียบจุดรวมพล</h2>
          {geoError ? (
            <p className="py-10 text-center text-sm text-signal-red">{geoError}</p>
          ) : target ? (
            <RadarGeofence distance={distance} radius={target.allowedRadiusMeters} accuracy={coords?.accuracy} />
          ) : (
            <p className="py-10 text-center text-sm text-olive-400">กำลังโหลดจุดรวมพล...</p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleAction("checkin")}
              disabled={busy !== null || !inRange || !faceRegistered}
              className="rounded-lg bg-olive-700 py-3 text-sm font-semibold text-paper transition hover:bg-olive-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "checkin" ? "กำลังบันทึก..." : "ลงชื่อเข้าแถว"}
            </button>
            <button
              onClick={() => handleAction("checkout")}
              disabled={busy !== null || !inRange || !faceRegistered}
              className="rounded-lg border border-olive-700 py-3 text-sm font-semibold text-olive-700 transition hover:bg-olive-700/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "checkout" ? "กำลังบันทึก..." : "ลงชื่อออก"}
            </button>
          </div>
          {!inRange && target && (
            <p className="mt-2 text-center text-xs text-olive-500">
              ต้องอยู่ในรัศมี {target.allowedRadiusMeters} เมตรจากจุดรวมพลจึงจะลงชื่อได้
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
