import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Replace with real competitor pages you want to track
COMPETITORS = [
    {"name": "Example", "url": "https://example.com"},
]

OUT = Path(__file__).resolve().parent.parent / "data" / "snapshot.json"


def check(site):
    try:
        r = requests.get(site["url"], timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        return {
            "name": site["name"],
            "url": site["url"],
            "status": r.status_code,
            "title": soup.title.string.strip() if soup.title and soup.title.string else "",
            "response_ms": int(r.elapsed.total_seconds() * 1000),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        return {"name": site["name"], "url": site["url"], "error": str(e)}


if __name__ == "__main__":
    results = [check(s) for s in COMPETITORS]
    OUT.write_text(json.dumps(results, indent=2))
    print(f"Saved {len(results)} results to {OUT}")