'''
Notes to reader:

Look at notes for frank/frary first

Some items do not have nutritional info, like coke and coke zero,
so their nutritional column values are null/None
Some nutritional values are < 1 or < 5, so column types are all text and
we can figure out what to do with that later
These do not have Vitamin A, Vitamin C, Vitamin D, Calcium, or Iron
All serving units are ounces (oz)
Meals are given as lists, [Breakfast, Lunch, Dinner], so each item is only listed once
but can be included in different meals
McConnel has large gaps in nutrition info for particular locations (like comfort, global, etc)

Change DB_URL to the correct database and uncomment lines at the bottom to upload data

No peanut yet, other allergens and dietary restrictions are found in the json
Shellfish is very rare but it should be working as well
Mcconnel's json does not track any allergens/dietary restrictions besides gluten free, vegan, and vegetarian
'''

import os
import json
from datetime import date
from pathlib import Path
import requests
import re

#extraction---------------------------------------

url_collins = "https://collins-cmc.cafebonappetit.com/cafe/collins/"
url_malott = "https://scripps.cafebonappetit.com/"
url_mcconnel = "https://pitzer.cafebonappetit.com/"



def cleanJSON(url):
    '''makes the given html -> json parsable by extracting the parts that matter'''
    response = requests.get(url, timeout=10)
    html = response.text
    decoder = json.JSONDecoder()

    start = html.index("{", html.index("Bamco.menu_items ="))
    finalMenu, _ = decoder.raw_decode(html, start)

    date = re.search(r'/(\d{4}-\d{2}-\d{2})/"[^>]*>\s*Today\s*<', html).group(1)

    for m in re.finditer(r"Bamco\.dayparts\['\d+'\]\s*=\s*", html):
        daypart, _ = decoder.raw_decode(html, m.end())
        for station in daypart["stations"]:
            for item_id in station["items"]:
                if item_id in finalMenu:
                    finalMenu[item_id]["date"] = date
                    finalMenu[item_id].setdefault("meals", []).append(daypart["label"].strip())

    return (finalMenu, date)

output_collins = cleanJSON(url_collins)
date = output_collins[1]
menu_collins = output_collins[0]
output_malott = cleanJSON(url_malott)
menu_malott = output_malott[0]
output_mcconnel = cleanJSON(url_mcconnel)
menu_mcconnel = output_mcconnel[0]

#parsing---------------------------------------

test1 = next(iter(menu_collins.values()))
#print(test1)

# Diet restrictions + allergens, always added as boolean columns.
FLAG_COLUMNS = [
    "Vegan", "Vegetarian", "Gluten Free",
    "Peanut", "Tree Nut", "Milk", "Egg", "Soy",
    "Sesame", "Fish", "Shellfish", "Wheat",
]

# Bon Appétit label -> column name in SQL
LABEL_MAP = {
    "Made without Gluten-Containing Ingredients": "Gluten Free",
    "Wheat/Gluten": "Wheat"
}

def lt_to_zero(v):
    """Turn values like '<5', '< 1' into 0; leave everything else as-is."""
    if isinstance(v, str) and v.strip().startswith("<"):
        return 0
    return v

def nv(nutrition, key):
    """Value of a nutrient field, or None if the field is missing."""
    return (nutrition.get(key) or {}).get("value")

def parseItem(itemDict):
    '''parse one item in the json file
    returns a dict of the important description and nutrient columns'''
    item = itemDict
    nutrition = item["nutrition_details"]
    allergens = item["cor_icon"]
    allergensToUpdate = {}
    if allergens != []:
        for value in allergens.values():
            col = LABEL_MAP.get(value, value)  # rename if mapped, else keep as-is
            if col in FLAG_COLUMNS:
                allergensToUpdate[col] = True

    serving = nutrition.get("servingSize") or {}
    serving_value = serving.get("value")
    serving_unit = serving.get("unit")

    # if nutrition == {}:
    #     info = {
    #     "itemID": item["id"],
    #     "category": item["station"],
    #     "meal": item["meals"],
    #     "description": item["description"],
    #     "shortName": item["label"],
    #     "serving": None,
    #     "Calories (kcal)": None,
    #     "Total Lipid/Fat (g)": None,
    #     #"Saturated fatty acid (g)": None,
    #     #"Trans Fat (g)": None,
    #     "Cholesterol (mg)": None,
    #     "Sodium (mg)": None,
    #     "Carbohydrates (g)": None,
    #     "Total Dietary Fiber (g)": None,
    #     "Total Sugars (g)": None,
    #     "Protein (g)": None,
    #     "servedate": item["date"]
    #     }
    
    info = {
        "itemID": item["id"],
        "category": item["station"],
        "meal": item["meals"],
        "description": item["description"],
        "shortName": item["label"],
        "serving": f"{serving_value} {serving_unit}" if serving_value else None,
        "Calories (kcal)": nv(nutrition, "calories"),
        "Total Lipid/Fat (g)": nv(nutrition, "fatContent"),
        #"Saturated fatty acid (g)": nv(nutrition, "saturatedFatContent"),
        #"Trans Fat (g)": nv(nutrition, "transFatContent"),
        "Cholesterol (mg)": nv(nutrition, "cholesterolContent"), #other jsons use grams, not mg
        "Sodium (mg)": nv(nutrition, "sodiumContent"),
        "Carbohydrates (g)": nv(nutrition, "carbohydrateContent"),
        "Total Dietary Fiber (g)": nv(nutrition, "fiberContent"),
        "Total Sugars (g)": nv(nutrition, "sugarContent"),
        "Protein (g)": nv(nutrition, "proteinContent"),
        "servedate": item["date"]
    }
    NON_NUTRIENT = {"itemID", "category", "meal", "description", "shortName", "serving", "servedate"}
    for k, v in info.items():
        if k not in NON_NUTRIENT:
            info[k] = lt_to_zero(v)

    info.update(allergensToUpdate)
    return info

#print(parseItem(test1))

def entireMenu(menu):
    '''parses the entire menu by iterating over the dict
    returns a list of dicts, with each dict representing one item'''
    return [parseItem(item) for item in menu.values()]

#print(entireMenu(menu_collins))
parsedMenu_collins = entireMenu(menu_collins)
parsedMenu_malott = entireMenu(menu_malott)
parsedMenu_mcconnel = entireMenu(menu_mcconnel)



#uploading---------------------------------------

import os
from collections import Counter
import psycopg

DB_URL = os.environ["DATABASE_URL"]
TABLE = "menu_items_collins"


def q(name):
    """Double-quote an identifier so names with spaces, '/' or '()' are kept as-is."""
    return '"' + name.replace('"', '""') + '"'


def split_record(rec):
    """Separate flag keys from the rest; missing flags default to False."""
    base = {k: v for k, v in rec.items() if k not in FLAG_COLUMNS}
    flags = {c: bool(rec.get(c, False)) for c in FLAG_COLUMNS}
    return base, flags


def load(data, TABLE, db_url=DB_URL):
    split = [split_record(rec) for rec in data]
    bases = [b for b, _ in split]

    # Original column logic, applied to the non-flag keys only.
    key_lists = [list(rec.keys()) for rec in bases]
    if len({len(keys) for keys in key_lists}) != 1:
        all_keys = set().union(*key_lists)
        uneven = sorted(k for k in all_keys if sum(k in keys for keys in key_lists) < len(key_lists))
        raise ValueError(f"Records do not all have the same number of keys. Uneven keys: {uneven!r}")
    columns = [Counter(keys).most_common(1)[0][0] for keys in zip(*key_lists)]

    types = ["TEXT"] * len(columns)
    types[0] += " PRIMARY KEY"  # first key (itemID) is the primary key

    all_columns = columns + FLAG_COLUMNS
    all_types = types + ["BOOLEAN NOT NULL DEFAULT FALSE"] * len(FLAG_COLUMNS)

    drop_sql = f"DROP TABLE IF EXISTS {q(TABLE)};"
    create_sql = "CREATE TABLE IF NOT EXISTS {} (\n    {}\n);".format(
        q(TABLE),
        ",\n    ".join(f"{q(c)} {t}" for c, t in zip(all_columns, all_types)),
    )
    insert_sql = (
        f"INSERT INTO {q(TABLE)} ({', '.join(q(c) for c in all_columns)}) "
        f"VALUES ({', '.join(['%s'] * len(all_columns))}) "
        f"ON CONFLICT ({q(columns[0])}) DO NOTHING"
    )

    # Everything else becomes a string; None stays NULL. Flags are real booleans.
    rows = [
        tuple(None if v is None else str(v) for v in base.values())
        + tuple(flags[c] for c in FLAG_COLUMNS)
        for base, flags in split
    ]

    # psycopg 3: the `with` block commits and closes the connection.
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(drop_sql)  # start fresh: removes any older table and its data
            cur.execute(create_sql)
            cur.executemany(insert_sql, rows)
    print(f"Inserted {len(rows)} rows into {TABLE}.")


if __name__ == "__main__":
    load(parsedMenu_collins, "menu_items_collins")
    load(parsedMenu_malott, "menu_items_malott")
    load(parsedMenu_mcconnel, "menu_items_mcconnel")
