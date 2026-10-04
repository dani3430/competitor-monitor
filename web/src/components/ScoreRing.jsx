export default function ScoreRing({ score, size = 56 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color =
    score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          className={`ring-fill stroke-current ${color}`}
          style={{ "--ring-circ": circ, "--ring-offset": offset, strokeDashoffset: offset }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold">{score}</span>
    </div>
  );
}