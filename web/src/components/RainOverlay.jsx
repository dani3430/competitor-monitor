"use client";

const DROPS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  delay: ((i * 53) % 20) / 10,
  duration: 0.6 + (((i * 29) % 10) / 10) * 0.8,
  height: 12 + ((i * 17) % 28),
}));

export default function RainOverlay({ active }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-[2px]">
      {DROPS.map((d) => (
        <span
          key={d.id}
          className="absolute top-0 w-px animate-rain rounded-full bg-gradient-to-b from-transparent to-cyan-300"
          style={{
            left: `${d.left}%`,
            height: `${d.height}px`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
      <p className="absolute inset-0 grid place-items-center text-lg font-medium tracking-widest text-cyan-200 animate-pulse">
        ANALYZING COMPETITORS…
      </p>
    </div>
  );
}