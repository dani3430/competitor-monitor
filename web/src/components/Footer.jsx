export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-white/10">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
        <p>
          © {year} Automated Competitor Monitoring Dashboard. Developed by{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">Daniel Temesgen</span>.
        </p>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/dani3430/competitor-monitor"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-cyan-600 dark:hover:text-cyan-300"
          >
            GitHub
          </a>
          <a
            href="mailto:danieltemesgen75@gmail.com"
            className="transition hover:text-cyan-600 dark:hover:text-cyan-300"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}