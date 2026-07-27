import { forwardRef, useEffect, useState, type RefObject } from "react";

interface Props {
  active: boolean;
  className?: string;
}

const CameraFrame = forwardRef<HTMLVideoElement, Props>(({ active, className = "" }, ref) => {
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (active) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } } })
        .then((s) => {
          currentStream = s;
          setStream(s);
          setError(null);
          const video = (ref as RefObject<HTMLVideoElement>)?.current;
          if (video) video.srcObject = s;
        })
        .catch(() => setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง"));
    }
    return () => {
      currentStream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 border-olive-700 bg-olive-950 ${className}`}>
      {active ? (
        <video ref={ref} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-olive-400 text-sm font-mono">
          กล้องปิดอยู่
        </div>
      )}
      {/* reticle overlay */}
      {active && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[62%] w-[62%] rounded-[45%] border-2 border-dashed border-brass-400/70" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-olive-950/95 p-4 text-center text-sm text-signal-red">
          {error}
        </div>
      )}
      {stream && !error && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-olive-950/70 px-2 py-1 font-mono text-[10px] tracking-widest text-signal-red">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-red" /> REC
        </div>
      )}
    </div>
  );
});

CameraFrame.displayName = "CameraFrame";
export default CameraFrame;
