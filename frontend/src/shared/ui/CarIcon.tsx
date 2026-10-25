const SEDAN = "M3 22h58v-4.5c0-2-1-3.2-3-3.7L47 12.5 39 6.5H25.5L17 13l-10 2C4.5 15.5 3 17 3 19z";
const SEDAN_WINDOWS = "M20 12.6l5.6-4.6h12.4l6.8 4.6z";

/** [body, windows] per category. */
const SHAPES: Record<string, [string, string]> = {
  SEDAN: [SEDAN, SEDAN_WINDOWS],
  ELECTRIC: [SEDAN, SEDAN_WINDOWS],
  SUV: ["M3 22h58v-5.5c0-1.7-1-2.8-2.6-3.2L53 12.5l-4-7H17.5L12 13l-6.5 1.8C3.9 15.2 3 16.3 3 18z", "M16 12.6l3.4-5h27.2l3.2 5z"],
  HATCHBACK: ["M3 22h58v-4.5c0-1.2-.8-2.2-2-2.5L50 14l-5.5-7.5h-20L16.5 14 6 16c-1.8.4-3 1.6-3 3z", "M19.5 13l5-5h18.6l4 5z"],
  COUPE: ["M3 22h58v-4c0-1.6-1-2.8-2.5-3.2L44 12 35.5 6.5h-9L17 13l-11 2.2C4.2 15.5 3 16.8 3 18.5z", "M20.5 12.4l6-4.2h7.8l6.4 4.2z"],
  TRUCK: ["M3 22h58V12H41V8c0-1-.7-2-2-2H21l-6.5 7L6 14.5C4 15 3 16.2 3 18z", "M18 12.4l4.6-4.6H37v4.6z"],
};

/** Abstract per-category vehicle silhouette. Decorative: the category is always also written out as text. */
export function CarIcon({ category, className }: { category: string; className?: string }) {
  const key = category.trim().toUpperCase();
  const [body, windows] = SHAPES[key] ?? SHAPES.SEDAN!;
  return (
    <svg viewBox="0 0 64 30" aria-hidden className={className}>
      <path d={body} fill="currentColor" />
      <path d={windows} className="fill-surface" opacity=".88" />
      {key === "ELECTRIC" && <path d="M33.5 14.5l-3.6 4.2h2.6l-1 3.6 4.2-4.6H34z" className="fill-accent" />}
      {[16, 48].map((cx) => (
        <g key={cx} className="wheel">
          <circle cx={cx} cy={23} r={5.5} className="fill-surface stroke-current" strokeWidth={2.4} />
          <path d={`M${cx - 3} 23h6M${cx} 20v6`} className="stroke-current" strokeWidth={1.2} />
        </g>
      ))}
    </svg>
  );
}
