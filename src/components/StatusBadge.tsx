import type { Status } from "../types";

const STYLES: Record<Status, string> = {
  มา: "bg-signal-green/15 text-signal-green border-signal-green/40",
  สาย: "bg-signal-amber/15 text-signal-amber border-signal-amber/40",
  ขาด: "bg-signal-red/15 text-signal-red border-signal-red/40",
  ลา: "bg-olive-400/15 text-olive-700 border-olive-400/40",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono tracking-wide ${STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
