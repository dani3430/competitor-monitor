const KEY = "cm-reports";
const MAX = 10;

export function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function saveReport(result) {
  const entry = {
    id: String(Date.now()),
    saved_at: new Date().toISOString(),
    label: `${result.me.name} vs ${result.competitors.map((c) => c.name).join(", ")}`,
    score: result.me.overall,
    result,
  };
  const list = [entry, ...loadReports()].slice(0, MAX);
  write(list);
  return list;
}

export function deleteReport(id) {
  const list = loadReports().filter((r) => r.id !== id);
  write(list);
  return list;
}

export function clearReports() {
  write([]);
  return [];
}