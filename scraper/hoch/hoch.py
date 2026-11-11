'''
Notes to reader:

Read the notes for frank for a better idea of how these parsers are structured
Replace DB_URL with the correct database url
I removed added sugar as a column because every item lists it as null
description and serving/servingDescription can also be removed,
servingDescription is easier to read but requires slightly more parsing later on
(they list things like "1 1/2 cup" which means 1/2 cup, not a mixed fraction)

Most column names will be the same as they are for frank and frary,
with minor changes like added sugar and locationID removed

Hoch's menu now comes from Sodexo's menu API (one day per request).
The API needs a key: set SODEXO_API_KEY as an environment variable
or put it in a .env file (and keep .env out of git).
'''

import os
import json
from datetime import date as Date
from pathlib import Path
import requests
import re

try:
    from dotenv import load_dotenv  # optional: reads SODEXO_API_KEY from a .env file
    load_dotenv()
except ImportError:
    pass

#extraction-----------------------------------------

LOCATION_ID = "13147001"
MENU_ID = "1411281"
URL = f"https://api-prd.sodexomyway.net/v0.2/data/menu/{LOCATION_ID}/{MENU_ID}"

HEADERS = {
    "API-Key": os.environ["SODEXO_API_KEY"],  # use the exact header name from DevTools
    "Origin": "https://hmc.sodexomyway.com",
    "Referer": "https://hmc.sodexomyway.com/",
    "User-Agent": "Mozilla/5.0",
}


def fetchMenu(day=None):
    '''gets one day's menu from the Sodexo API (defaults to today)
    returns (list of meal sections, date string)'''
    day = day or Date.today()
    response = requests.get(URL, params={"date": day.isoformat()}, headers=HEADERS, timeout=10)
    response.raise_for_status()
    data = response.json()

    # readable copy next to this script, for checking the structure
    # out_path = Path(__file__).parent / "menu_dump.json"
    # out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    # print(f"Saved menu JSON to {out_path}")

    # the API may return the meal sections directly, or wrapped in {"sections": [...]}
    sections = data["sections"] if isinstance(data, dict) and "sections" in data else data
    return (sections, day.isoformat())


#sections elements are separated by meal
output = fetchMenu()        # or fetchMenu(Date(2026, 11, 2)) for a specific day
date = output[1]
menu_hoch = output[0]

items = [
    item
    for section in menu_hoch
    for group in section["groups"]
    for item in group["items"]
]

#parsing-----------------------------------------

ALLERGENS = ["Gluten", "Peanut", "Tree nut", "Milk", "Egg", "Soy",
             "Sesame", "Fish", "Shellfish", "Wheat"]


def allergen_key(label):
    '''loose match, so "Tree Nuts" -> "treenut" and "Eggs" -> "egg"'''
    key = re.sub(r"[\s_-]+", "", label).lower()
    return key[:-1] if key.endswith("s") else key


ALLERGEN_LOOKUP = {allergen_key(a): a for a in ALLERGENS}

#test_item1 = menu_hoch[0]["groups"][0]["items"][0]
#test_item2 = menu_hoch[1]["groups"][0]["items"][0]

def unit(value, n=None):
    '''pull the number out of a string like "12g", "340mg" or "0.5 g"
    "<5g" style values round down to 0; None if there's no number'''
    if not isinstance(value, str):
        return value
    if value.strip().startswith("<"):
        return "0"
    match = re.search(r"\d+(?:\.\d+)?", value)
    return match.group() if match else None


def parseItem(itemDict):
    '''itemDict is one item in the menu'''
    item = itemDict
    for key, value in item.items():
        if value == '':
            item[key] = None

    allergen_flags = {a: False for a in ALLERGENS}
    for a in item["allergens"] or []:
        if isinstance(a, str):
            label = a
        else:
            label = a.get("name") or a.get("Allergen") or a.get("allergen")
        if label:
            # use the standard column name if it matches one of the ten
            allergen_flags[ALLERGEN_LOOKUP.get(allergen_key(label), label)] = True

    # store gluten as "Gluten Free": True when the item does NOT contain gluten
    allergen_flags = {
        ("Gluten Free" if k == "Gluten" else k): (not v if k == "Gluten" else v)
        for k, v in allergen_flags.items()
    }

    info = {
        # "itemID": item["menuItemId"],
        "category": item["course"],
        "meal": item["meal"],
        "description": item["description"],
        "shortName": item["formalName"],
        "servingDescription": item["portionSize"],
        "serving": item["portion"],
        "Calories (kcal)": item["calories"],
        "Total Lipid/Fat (g)": unit(item["fat"], 1),
        #"Saturated fatty acid (g)": unit(item["saturatedFat"], 1),
        #"Trans Fat (g)": unit(item["transFat"], 1),
        "Cholesterol (mg)": unit(item["cholesterol"], 2),
        "Sodium (mg)": unit(item["sodium"], 2),
        "Carbohydrates (g)": unit(item["carbohydrates"], 1),
        "Total Dietary Fiber (g)": unit(item["dietaryFiber"], 1),
        "Total Sugars (g)": unit(item["sugar"], 1),
        #"Added Sugar (g)": item["addedSugar"], seems to be null for every item so far, so we leave it out for now
        "Protein (g)": unit(item.get("protein"), 1),
        # "Vitamin C (mg)": unit(item["vitaminC"], 2),
        # "Calcium (mg)": unit(item["calcium"], 2),
        # "Iron (mg)": unit(item["iron"], 2),
        # "Vitamin A (IU)": unit(item["vitaminA"], 2), #frank/frary has it as mcg RAE units
        # "Vitamin D (mg)": unit(item["vitaminD"], 2),
        "servedate": date,
        "Vegan": item["isVegan"],
        "Vegetarian": item["isVegetarian"]
    }
    info.update(allergen_flags)  # each allergen becomes its own True column

    return info


def entireMenu(menu):
    '''parse the entire menu by iterating parseByMeal over the menu
    return a list of dicts (append all the meals together)'''
    return [parseItem(item) for item in menu if item["ingredients"] != "Peripherals Fall Menu"]

parsedMenu = entireMenu(items)
#print(parsedMenu)

#uploading-----------------------------------------
"""
Load pre-parsed menu nutrition records (list of dicts) into Postgres
"""

from collections import Counter, defaultdict
import psycopg

DB_URL = os.environ["DATABASE_URL"]
TABLE = "menu_items_hoch"


def norm(key):
    """Spelling-insensitive form of a key, so 'Vitamin D(mg)' matches 'Vitamin D (mg)'."""
    return re.sub(r"\s+", "", key).lower()


def column_type(key, value):
    """Bools -> BOOLEAN; integers -> BIGINT; keys with a unit like '(g)' -> NUMERIC; else TEXT."""
    if isinstance(value, bool):  # must come before int: bool is a subclass of int
        return "BOOLEAN"
    if isinstance(value, int):
        return "BIGINT"
    if re.search(r"\([^)]*\)\s*$", key):
        return "NUMERIC"
    return "TEXT"


def q(name):
    """Double-quote an identifier so names with spaces, '/' or '()' are kept as-is."""
    return '"' + name.replace('"', '""') + '"'


def load(data, db_url=DB_URL):
    if not data:
        raise ValueError("No records to load (data is empty); table left unchanged.")

    # Re-key every record by normalized key, and track how each key is spelled.
    records = []
    spellings = defaultdict(Counter)  # normalized key -> Counter of original spellings
    order = []                        # normalized keys in order of first appearance
    for rec in data:
        nrec = {}
        for k, v in rec.items():
            n = norm(k)
            nrec[n] = v
            if n not in spellings:
                order.append(n)
            spellings[n][k] += 1
        records.append(nrec)

    # Column name = the spelling most records use.
    name = {n: spellings[n].most_common(1)[0][0] for n in order}

    # A key is a flag column if some record lacks it, or its values are booleans.
    presence = Counter(n for r in records for n in r)

    def is_flag(n):
        if presence[n] < len(records):
            return True
        return all(isinstance(r[n], bool) for r in records)

    base = [n for n in order if not is_flag(n)]   # present in every record
    flags = [n for n in order if is_flag(n)]       # true/false columns
    if not base:
        raise ValueError("No key is shared by every record; can't pick a primary key.")

    # Base keys exist in every record, so their order follows the first record
    # and base[0] is still itemID.
    columns = [name[n] for n in base] + [name[n] for n in flags]
    types = [column_type(name[n], records[0][n]) for n in base]
    types += ["BOOLEAN NOT NULL DEFAULT FALSE"] * len(flags)

    drop_sql = f"DROP TABLE IF EXISTS {q(TABLE)};"
    create_sql = "CREATE TABLE IF NOT EXISTS {} (\n    {},\n    {}\n);".format(
        q(TABLE),
        '"id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
        ",\n    ".join(f"{q(c)} {t}" for c, t in zip(columns, types)),
    )
    insert_sql = (
        f"INSERT INTO {q(TABLE)} ({', '.join(q(c) for c in columns)}) "
        f"VALUES ({', '.join(['%s'] * len(columns))}) "
    )

    # Base values as-is; flags are True if the record has the key, else False.
    rows = [
        tuple([r[n] for n in base] + [bool(r.get(n, False)) for n in flags])
        for r in records
    ]

    # psycopg 3: the `with` block commits and closes the connection.
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(drop_sql)  # start fresh: removes any older table and its data
            cur.execute(create_sql)
            cur.executemany(insert_sql, rows)

    print(f"Inserted {len(rows)} rows into {TABLE}.")
    print(f"Flag columns ({len(flags)}): {', '.join(name[n] for n in flags)}")

if __name__ == "__main__":
    load(parsedMenu)