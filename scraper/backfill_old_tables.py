"""
Copy the old one-table-per-day uploads (menu_items_MM-DD-YYYY, Brandon's original
column names) into all_menu_items, cleaned up the same way as the daily scrape.

    python scraper/backfill_old_tables.py menu_items_11-13-2026 menu_items_11-15-2026
    python scraper/backfill_old_tables.py --dry-run menu_items_11-13-2026

The old tables stored Bon Appetit flags with a typo ("Tree nut" never matched the
"Tree Nut" label), so for those halls the labels are fetched again from that day's
archived menu page. Items missing from that page keep the old flags, with tree_nut
unknown (None) and McConnell's allergens unknown, like the daily scrape.

Rerunning is safe: each hall's day is replaced, not duplicated.
The old tables are left as they are.
"""

import json
import re
import sys
from collections import Counter

import requests

from menu_database import (ALLERGENS, HALLS_WITHOUT_ALLERGENS, HALL_NAMES, ba_labels,
                           get_supabase, summarize, to_date, to_row, upload_menu_items)

BA_DATED_URLS = {
    "collins": "https://collins-cmc.cafebonappetit.com/cafe/collins/{date}/",
    "malott": "https://scripps.cafebonappetit.com/cafe/malott-dining-commons/{date}/",
    "mcconnell": "https://pitzer.cafebonappetit.com/cafe/mcconnell-bistro/{date}/",
}

_label_cache = {}


def labels_for_day(hall, day):
    """{item id: set of labels} from a Bon Appetit hall's archived page for that day."""
    key = (hall, day)
    if key not in _label_cache:
        html = requests.get(BA_DATED_URLS[hall].format(date=day.isoformat()),
                            headers={"User-Agent": "Mozilla/5.0"}, timeout=20).text
        start = html.index("{", html.index("Bamco.menu_items ="))
        menu, _ = json.JSONDecoder().raw_decode(html, start)
        _label_cache[key] = ba_labels(menu)
    return _label_cache[key]


def fetch_table(name):
    rows, start = [], 0
    while True:
        batch = (get_supabase().table(name).select("*").order("row_id")
                 .range(start, start + 999).execute().data)
        rows += batch
        start += 1000
        if len(batch) < 1000:
            return rows


def convert(old_row, stats):
    """One row of an old table -> standard rows (one per meal)."""
    record = dict(old_row)
    meal = record.get("meal")
    if isinstance(meal, str) and meal.startswith("["):
        record["meal"] = json.loads(meal)   # Bon Appetit meal lists were stored as JSON text

    hall = HALL_NAMES.get((record.get("dining_hall") or "").strip().lower())
    if hall not in BA_DATED_URLS:
        stats["other halls"] += 1
        return to_row(record)

    labels = labels_for_day(hall, to_date(record.get("servedate"))).get(str(record.get("itemID")))
    if labels is not None:
        stats["bon appetit, labels refetched"] += 1
        return to_row(record, labels)

    # not on the archived page: keep the old flags, minus the ones we know are wrong
    stats["bon appetit, old flags kept"] += 1
    rows = to_row(record)
    for row in rows:
        row["tree_nut"] = None
        if hall in HALLS_WITHOUT_ALLERGENS:
            row.update({col: None for col in ALLERGENS})
            row["is_gluten_free"] = True if record.get("Gluten Free") is True else None
    return rows


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    tables = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not tables:
        sys.exit(__doc__)

    for table in tables:
        if not re.fullmatch(r"menu_items_\d{2}-\d{2}-\d{4}", table):
            sys.exit(f"Not an old per-day table: {table}")
        old_rows = fetch_table(table)
        stats = Counter()
        rows = [row for old in old_rows for row in convert(old, stats)]
        print(f"{table}: {len(old_rows)} old rows -> {len(rows)} rows  {dict(stats)}")
        if dry_run:
            summarize(rows)
        else:
            upload_menu_items(rows)
