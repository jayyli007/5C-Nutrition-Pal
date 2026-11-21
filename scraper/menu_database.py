#most of the individual parsers should already account for these things, but fix any errors that you see
# Kaylum: to_number standardizes the data types and other formatting inconsistencies
# we get from the different scrapers, so it's easier if we use it

"""
Shared menu layer for all six dining halls.

    python scraper/menu_database.py             scrape every hall, standardize, upload to Supabase
    python scraper/menu_database.py --dry-run   same, but print a summary instead of uploading

Each scraper keeps its own fetching and parsing. This file turns their records into
one standard row shape (SCHEMA below) and uploads them into all_menu_items,
one table that holds every hall and every day (see all_menu_items.sql).

Rules (from the Menu Format Map):
- one row per dining hall, date, meal and item
- nutrients are numbers; missing or unreadable means None, never 0; "< 1" means 0
- an item with 1000+ calories keeps its row, but all 8 macros become None
- flags are None when the hall doesn't report them (McConnell reports no allergens)
- is_gluten_free: True if labeled gluten-free, or the hall tags allergens and the item
  has no wheat/gluten tag; False if it has one; otherwise None
"""

import importlib
import json
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv


def to_number(value) -> int | float | None:
    if value is None:
        return None

    if isinstance(value, int) or isinstance(value, float):
        return value

    characters = value.replace(" ", "")
    is_float = False

    if characters.startswith(("<", "lessthan")):
        return 0

    characters = list(characters)


    for i in range(len(characters)-1, -1, -1):
        try:
            int(characters[i])

        except ValueError:
            if characters[i] == ".":
                is_float = True

            else:
                characters.pop(i)

    output = "".join(characters)

    try:
        if is_float:
            output = float(output)

        else:
            output = int(output)

    except ValueError:
        return None

    return output


# ---------- shared schema ----------

# column name -> Postgres type. This is what one finished row looks like.
SCHEMA = {
    "dining_hall": "text",       # collins, malott, mcconnell, frank, frary, hoch
    "serve_date": "date",
    "meal": "text",              # breakfast, brunch, lunch, dinner (one per row)
    "station": "text",
    "item_id": "text",           # the source's own ID
    "name": "text",
    "description": "text",
    "serving": "text",
    "calories": "double precision",
    "protein_g": "double precision",
    "carbs_g": "double precision",
    "fat_g": "double precision",
    "fiber_g": "double precision",
    "cholesterol_mg": "double precision",
    "sodium_mg": "double precision",
    "sugar_g": "double precision",
    "is_vegan": "boolean",
    "is_vegetarian": "boolean",
    "is_gluten_free": "boolean",
    "peanut": "boolean",
    "tree_nut": "boolean",
    "milk": "boolean",
    "egg": "boolean",
    "soy": "boolean",
    "sesame": "boolean",
    "fish": "boolean",
    "shellfish": "boolean",
    "wheat": "boolean",
    "tier": "smallint",          # Bon Appetit only: 1 specials, 2 additional favorites, 3 condiments/extras; None elsewhere
}

# shared column -> the key the scrapers use
NUTRIENTS = {
    "calories": "Calories (kcal)",
    "protein_g": "Protein (g)",
    "carbs_g": "Carbohydrates (g)",
    "fat_g": "Total Lipid/Fat (g)",
    "fiber_g": "Total Dietary Fiber (g)",
    "cholesterol_mg": "Cholesterol (mg)",
    "sodium_mg": "Sodium (mg)",
    "sugar_g": "Total Sugars (g)",
}
ALLERGENS = {
    "peanut": "Peanut",
    "tree_nut": "Tree nut",
    "milk": "Milk",
    "egg": "Egg",
    "soy": "Soy",
    "sesame": "Sesame",
    "fish": "Fish",
    "shellfish": "Shellfish",
    "wheat": "Wheat",
}

# Bon Appetit's own label text -> shared allergen column.
# Read straight from the raw feed, because the parsed records spell "Tree nut"
# while the feed says "Tree Nut", so tree nuts never got flagged.
BA_ALLERGEN_LABELS = {
    "Peanut": "peanut",
    "Tree Nut": "tree_nut",
    "Milk": "milk",
    "Egg": "egg",
    "Soy": "soy",
    "Sesame": "sesame",
    "Fish": "fish",
    "Shellfish": "shellfish",
    "Wheat/Gluten": "wheat",
}
BA_GLUTEN_FREE_LABEL = "Made without Gluten-Containing Ingredients"
BA_UNKNOWN_LABEL = "Information Unavailable"

HALL_NAMES = {
    "collins": "collins",
    "malott": "malott",
    "mcconnel": "mcconnell",
    "mcconnell": "mcconnell",
    "frank": "frank",
    "frary": "frary",
    "hoch": "hoch",
}
HALLS_WITHOUT_ALLERGENS = {"mcconnell"}

CALORIE_LIMIT = 1000


# ---------- record -> rows ----------

def clean_text(value):
    """Strip whitespace; empty strings become None."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def clean_station(value):
    """'<strong>@breakfast options</strong>' -> 'Breakfast Options'."""
    text = clean_text(value)
    if text is None:
        return None
    text = re.sub(r"<[^>]+>", "", text).strip().lstrip("@").strip()
    if text.islower() or text.isupper():
        text = text.title()
    return text or None


def to_date(value):
    """'2026-11-16' or '20261116' -> date(2026, 11, 16)."""
    if isinstance(value, date):
        return value
    text = clean_text(value)
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except (TypeError, ValueError):
            pass
    return None


def to_flag(value):
    """True/False stay as they are; anything else (None, missing) is unknown."""
    return value if isinstance(value, bool) else None


def nutrient_value(value):
    number = to_number(value)
    if isinstance(number, float):
        number = round(number, 2)   # Pomona sends float noise like 3.26e-09
    return number


def flags_for(record, hall, labels):
    """Diet and allergen flags for one record.

    labels is the set of Bon Appetit label strings for this item, or None for
    the other halls, whose parsed records already carry the flags."""
    if labels is not None and BA_UNKNOWN_LABEL in labels:
        return {col: None for col in ["is_vegan", "is_vegetarian", "is_gluten_free", *ALLERGENS]}

    if labels is not None:
        vegan = "Vegan" in labels
        vegetarian = "Vegetarian" in labels
        labeled_gluten_free = BA_GLUTEN_FREE_LABEL in labels
        if hall in HALLS_WITHOUT_ALLERGENS:
            allergens = {col: None for col in ALLERGENS}
        else:
            allergens = {col: False for col in ALLERGENS}
            for label in labels:
                if label in BA_ALLERGEN_LABELS:
                    allergens[BA_ALLERGEN_LABELS[label]] = True
        gluten_tagged = bool(allergens["wheat"])
    else:
        vegan = to_flag(record.get("Vegan"))
        vegetarian = to_flag(record.get("Vegetarian"))
        allergens = {col: to_flag(record.get(key)) for col, key in ALLERGENS.items()}
        if hall == "hoch":
            # hoch.py stores "Gluten Free" as "no Gluten allergen listed", not as a label
            labeled_gluten_free = False
            gluten_free_field = to_flag(record.get("Gluten Free"))
            gluten_tagged = None if gluten_free_field is None else not gluten_free_field
        else:
            labeled_gluten_free = record.get("Gluten Free") is True
            gluten_tagged = False
        if allergens["wheat"] is True:
            gluten_tagged = True

    if vegan is True:
        vegetarian = True   # vegan items aren't always tagged vegetarian too

    reports_allergens = all(v is not None for v in allergens.values())
    if labeled_gluten_free:
        gluten_free = True
    elif not reports_allergens or gluten_tagged is None:
        gluten_free = None
    else:
        gluten_free = not gluten_tagged

    return {"is_vegan": vegan, "is_vegetarian": vegetarian,
            "is_gluten_free": gluten_free, **allergens}


def to_tier(value):
    """Bon Appetit's tier as 1, 2 or 3; anything else (other halls, junk) is None."""
    n = to_number(str(value)) if value is not None else None
    return int(n) if n in (1, 2, 3) else None


def to_row(record, labels=None):
    """Turn one parsed scraper record into a list of standard rows, one per meal.

    Bon Appetit records list several meals, so they return several rows;
    Pomona and Hoch records return a list with one row."""
    hall_raw = clean_text(record.get("dining_hall")) or ""
    hall = HALL_NAMES.get(hall_raw.lower())
    if hall is None:
        raise ValueError(f"Unknown dining hall: {record.get('dining_hall')!r}")

    nutrients = {col: nutrient_value(record.get(key)) for col, key in NUTRIENTS.items()}
    if nutrients["calories"] is not None and nutrients["calories"] >= CALORIE_LIMIT:
        nutrients = {col: None for col in nutrients}

    item_id = clean_text(record.get("itemID"))
    if item_id == "0":
        item_id = None   # Hoch sends 0 for every item, which isn't a real ID

    base = {
        "dining_hall": hall,
        "serve_date": to_date(record.get("servedate")),
        "station": clean_station(record.get("category")),
        "item_id": item_id,
        "name": clean_text(record.get("shortName")),
        "description": clean_text(record.get("description")),
        "serving": clean_text(record.get("serving")),
        **nutrients,
        **flags_for(record, hall, labels),
        "tier": to_tier(record.get("tier")),
    }

    meals = record.get("meal")
    if not isinstance(meals, list):
        meals = [meals]
    meals = list(dict.fromkeys(m.strip().lower() for m in meals if clean_text(m)))
    if not meals:
        meals = [None]

    return [{**base, "meal": meal} for meal in meals]


# ---------- gather every hall ----------

def ba_labels(raw_menu):
    """{item id: set of label strings} from a raw Bon Appetit menu."""
    labels = {}
    for item in raw_menu.values():
        icons = item.get("cor_icon") or {}
        values = icons.values() if isinstance(icons, dict) else icons
        labels[str(item["id"])] = set(values)
    return labels


def load_all_rows():
    """Run every scraper and return (rows, failed_scrapers).

    One broken scraper doesn't stop the others; it's reported in failed_scrapers."""
    rows, failed = [], []
    sources = [
        ("bonappetit.bonappetit", [
            ("parsedMenu_collins", "menu_collins"),
            ("parsedMenu_malott", "menu_malott"),
            ("parsedMenu_mcconnel", "menu_mcconnel"),
        ]),
        ("frank_frary.pomona", [("MENU_FRANK", None), ("MENU_FRARY", None)]),
        ("hoch.hoch", [("parsedMenu", None)]),
    ]
    for module_name, menus in sources:
        try:
            module = importlib.import_module(module_name)
            for parsed_name, raw_name in menus:
                labels = ba_labels(getattr(module, raw_name)) if raw_name else None
                for record in getattr(module, parsed_name):
                    if not record:
                        continue
                    item_labels = labels.get(str(record.get("itemID"))) if labels else None
                    rows.extend(to_row(record, item_labels))
        except Exception as e:
            print(f"FAILED: {module_name}: {type(e).__name__}: {e}", file=sys.stderr)
            failed.append(module_name)
    return rows, failed


# ---------- upload (Brandon's supabase setup, now into one table) ----------
"""
Every day's rows go into one table, all_menu_items, so the frontend has a single
source and past days stay as history. Each run replaces one hall's menu for one day
at a time (through replace_menu_day), so rerunning a day never duplicates it, and a
hall whose scraper failed keeps whatever it already had.

ONE-TIME SETUP
1) python -m pip install -r requirements.txt
2) In Supabase -> SQL Editor, run scraper/all_menu_items.sql once.
3) Put these in .env (repo root or scraper/):
       SUPABASE_URL=https://<project ref>.supabase.co
       SUPABASE_KEY=sb_secret_...      (or the legacy service_role key)
   Both are in Project Settings -> API Keys, and you can copy them again any time.
"""

SCRIPT_DIR = Path(__file__).resolve().parent

load_dotenv(SCRIPT_DIR / ".env", override=True)
load_dotenv(SCRIPT_DIR.parent / ".env")   # repo-root .env, if the keys live there

TABLE = "all_menu_items"

_supabase = None


def get_supabase():
    """Connect only when uploading, so --dry-run works without Supabase keys."""
    global _supabase
    if _supabase is None:
        from supabase import create_client
        _supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    return _supabase


def to_json_value(value, col_type):
    """Convert a Python value into JSON the API accepts for that column."""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if col_type == "text" and not isinstance(value, str):
        return json.dumps(value) if isinstance(value, (dict, list)) else str(value)
    if col_type == "double precision" and isinstance(value, int) and not isinstance(value, bool):
        return float(value)
    return value


def group_by_day(rows):
    """{(serve_date, dining_hall): [rows]}; rows without a date can't be stored and are skipped."""
    groups = {}
    for row in rows:
        if row["serve_date"] is None:
            print(f"Skipped {row['dining_hall']} item {row['name']!r}: no serve date", file=sys.stderr)
            continue
        groups.setdefault((row["serve_date"], row["dining_hall"]), []).append(row)
    return groups


def upload_menu_items(rows):
    """Replace each hall's menu for each day in rows with the new rows."""
    groups = group_by_day(rows)
    if not groups:
        print("Nothing to upload.")
        return 0

    total = 0
    for (serve_date, hall), day_rows in sorted(groups.items()):
        payload = [{c: to_json_value(row.get(c), t) for c, t in SCHEMA.items()} for row in day_rows]
        inserted = get_supabase().rpc("replace_menu_day", {
            "p_serve_date": serve_date.isoformat(),
            "p_dining_hall": hall,
            "p_rows": payload,
        }).execute().data
        print(f"  {serve_date} {hall}: {inserted} rows")
        total += inserted

    print(f"Uploaded {total} rows into {TABLE}")
    return total


def summarize(rows):
    by_hall = {}
    for row in rows:
        by_hall[row["dining_hall"]] = by_hall.get(row["dining_hall"], 0) + 1
    for hall, count in sorted(by_hall.items()):
        print(f"  {hall}: {count} rows")
    print(f"  total: {len(rows)} rows")


if __name__ == "__main__":
    all_rows, failed_scrapers = load_all_rows()
    if "--dry-run" in sys.argv:
        summarize(all_rows)
    else:
        upload_menu_items(all_rows)
    if failed_scrapers:
        sys.exit(1)   # marks the GitHub Actions run as failed so someone notices
