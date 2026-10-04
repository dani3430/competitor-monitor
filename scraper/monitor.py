import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Add the competitor pages you want to track
COMPETITORS = [
    {"name": "Example", "url": "https://example.com"},
    {"name": "Python", "url": "https://www.python.org"},
    {"name": "GitHub", "url": "https://github.com"},
]

DATA = Path(__file__).resolve().parent.parent / "data"
SNAPSHOT = DATA / "snapshot.json"
HISTORY = DATA / "history.json"
MAX_HISTORY = 200  # entries kept per site


def load_json(path, default):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def check(site, history):
    now = datetime.now(timezone.utc).isoformat()
    try:
        r = requests.get(site["url"], timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        headings = " ".join(h.get_text(strip=True) for h in soup.find_all(["h1", "h2"]))
        content_hash = hashlib.sha256((title + headings).encode()).hexdigest()[:12]

        previous = history[-1] if history else None
        changed = bool(previous and previous.get("hash") and previous["hash"] != content_hash)

        return {
            "name": site["name"],
            "url": site["url"],
            "status": r.status_code,
            "up": r.status_code < 400,
            "title": title,
            "response_ms": int(r.elapsed.total_seconds() * 1000),
            "hash": content_hash,
            "changed": changed,
            "checked_at": now,
        }
    except Exception as e:
        return {
            "name": site["name"],
            "url": site["url"],
            "up": False,
            "error": str(e),
            "changed": False,
            "checked_at": now,
        }


if __name__ == "__main__":
    DATA.mkdir(exist_ok=True)
    history = load_json(HISTORY, {})
    snapshot = []

    for site in COMPETITORS:
        entries = history.get(site["url"], [])
        result = check(site, entries)
        entries.append(result)
        history[site["url"]] = entries[-MAX_HISTORY:]
        snapshot.append(result)
        print(f"{site['name']}: {'UP' if result['up'] else 'DOWN'}"
              f"{' (CHANGED)' if result['changed'] else ''}")

    SNAPSHOT.write_text(json.dumps(snapshot, indent=2))
    HISTORY.write_text(json.dumps(history, indent=2))
    print(f"Saved {len(snapshot)} results")