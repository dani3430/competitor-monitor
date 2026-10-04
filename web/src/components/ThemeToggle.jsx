"use client";

export default function ThemeToggle() {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark and light mode"
      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-lg text-slate-700 transition hover:scale-105 hover:border-cyan-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-cyan-400"
    >
      <span className="dark:hidden">🌙</span>
      <span className="hidden dark:inline">☀️</span>
    </button>
  );
}