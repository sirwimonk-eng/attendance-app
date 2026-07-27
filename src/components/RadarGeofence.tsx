interface Props {
  distance: number | null;
  radius: number;
  accuracy?: number;
}

export default function RadarGeofence({ distance, radius, accuracy }: Props) {
  const inRange = distance !== null && distance <= radius;
  const ratio = distance === null ? 0 : Math.min(distance / (radius * 2.4), 1);
  // Marker sits along a fixed bearing so it reads as "a position", not literally north.
  const angle = -35 * (Math.PI / 180);
  const r = 40 + ratio * 78;
  const mx = 120 + r * Math.cos(angle);
  const my = 120 + r * Math.sin(angle);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]">
      <svg viewBox="0 0 240 240" className="h-full w-full">
        <defs>
          <radialGradient id="radarFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-brass-400)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-brass-400)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="120" cy="120" r="118" fill="url(#radarFade)" />
        {[118, 88, 58, 28].map((rr) => (
          <circle key={rr} cx="120" cy="120" r={rr} fill="none" stroke="var(--color-brass-400)" strokeOpacity="0.25" strokeWidth="1" />
        ))}
        <line x1="2" y1="120" x2="238" y2="120" stroke="var(--color-brass-400)" strokeOpacity="0.15" />
        <line x1="120" y1="2" x2="120" y2="238" stroke="var(--color-brass-400)" strokeOpacity="0.15" />

        {/* allowed radius ring, drawn at a fixed visual size (58) to anchor the scale */}
        <circle cx="120" cy="120" r="58" fill="none" stroke="var(--color-signal-green)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* sweep */}
        <g className="radar-sweep" style={{ transformBox: "fill-box" }}>
          <path d="M120 120 L120 2 A118 118 0 0 1 190 32 Z" fill="var(--color-brass-400)" opacity="0.12" />
        </g>

        {/* center = assembly point */}
        <circle cx="120" cy="120" r="4" fill="var(--color-brass-500)" />

        {/* officer position marker */}
        {distance !== null && (
          <g>
            <circle cx={mx} cy={my} r="9" fill="none" stroke={inRange ? "var(--color-signal-green)" : "var(--color-signal-red)"} strokeWidth="1.5" className="ping-ring" style={{ transformOrigin: `${mx}px ${my}px` }} />
            <circle cx={mx} cy={my} r="5" fill={inRange ? "var(--color-signal-green)" : "var(--color-signal-red)"} />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
        <div className="font-mono text-[11px] uppercase tracking-widest text-olive-400">
          รัศมีที่กำหนด {radius} ม.
        </div>
      </div>

      {distance !== null && (
        <div className="mt-3 text-center">
          <div className={`font-mono text-2xl font-semibold ${inRange ? "text-signal-green" : "text-signal-red"}`}>
            {distance.toFixed(1)} ม.
          </div>
          <div className="text-xs text-olive-400">
            {inRange ? "อยู่ในพื้นที่จุดรวมพล" : "อยู่นอกพื้นที่ที่กำหนด"}
            {accuracy ? ` · ความแม่นยำ ±${Math.round(accuracy)} ม.` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
