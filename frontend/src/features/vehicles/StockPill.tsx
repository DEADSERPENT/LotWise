import { LOW_STOCK_THRESHOLD, stockStatus } from "../../shared/lib/format";

export const stockTone = (q: number) => (q === 0 ? "bad" : q <= LOW_STOCK_THRESHOLD ? "warn" : "ok");

/** Status is always spelled out in text; the colour and bar are reinforcement, never the only signal. */
export function StockPill({ q }: { q: number }) {
  const tone = stockTone(q);
  return (
    <span className="block">
      <span className={`pill ${tone}`}>{stockStatus(q)}</span>
      <span className="mt-1 block text-sm text-muted tabular-nums"><span key={q} className="flash px-0.5">{q}</span> available</span>
      <span aria-hidden className="mt-1.5 block h-1 w-24 overflow-hidden rounded-full bg-line">
        <span key={q} className={`grow-x block h-full rounded-full ${tone === "bad" ? "bg-bad" : tone === "warn" ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.min(q / 10, 1) * 100}%` }} />
      </span>
    </span>
  );
}
