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

The url that I use for hoch below only displays one day's worth of items
because the website has tabs for every day of the week
'''

import requests
import json

#extraction-----------------------------------------

url_hoch = "https://hmc.sodexomyway.com/en-us/locations/hoch-shanahan-dining-commons"

def cleanJSON(url):
    '''makes the given html -> json parsable by extracting the parts that matter'''
    response = requests.get(url, timeout=10)
    html = response.text

    marker = "window.__PRELOADED_STATE__ ="
    start = html.index("{", html.index(marker))
    data, _ = json.JSONDecoder().raw_decode(html, start)
    
    finalMenu = data["composition"]["subject"]["regions"][1]["fragments"][0]["content"]["main"]["sections"]
    date = data["composition"]["context"]["content"]["localDateTime"][:10]
    return (finalMenu, date)
#sections elements are separated by meal
output = cleanJSON(url_hoch)
date = output[1]
menu_hoch = output[0]

items = [
    item
    for section in menu_hoch
    for group in section["groups"]
    for item in group["items"]
]

#parsing-----------------------------------------

test_item1 = menu_hoch[0]["groups"][0]["items"][0]
test_item2 = menu_hoch[1]["groups"][0]["items"][0]

def parseItem(itemDict):
    '''itemDict is one item in the menu'''
    item = itemDict
    for key, value in item.items():
        if value == '':
            item[key] = None

    
    info = {
        "itemID": item["menuItemId"],
        "category": item["course"],
        "meal": item["meal"],
        "description": item["description"],
        "shortName": item["formalName"],
        "servingDescription": item["portionSize"],
        "serving": item["portion"],
        "Calories (kcal)": item["calories"],
        "Total Lipid/Fat (g)": item["fat"][:-1],
        "Saturated fatty acid (g)": item["saturatedFat"][:-1],
        "Trans Fat (g)": item["transFat"][:-1],
        "Cholesterol (g)": item["cholesterol"][:-2],
        "Sodium (mg)": item["sodium"][:-2],
        "Carbohydrates (g)": item["carbohydrates"][:-1],
        "Total Dietary Fiber (g)": item["dietaryFiber"][:-1],
        "Total Sugars (g)": item["sugar"][:-1],
        #"Added Sugar (g)": item["addedSugar"], seems to be null for every item so far, so we leave it out for now
        "Protein (g)": item["protein"][:-1],
        "Vitamin C (mg)": item["vitaminC"][:-2],
        "Calcium (mg)": item["calcium"][:-2],
        "Iron (mg)": item["iron"][:-2],
        "Vitamin A (IU)": item["vitaminA"][:-2], #frank/frary has it as mcg RAE units
        "Vitamin D (mg)": item["vitaminD"][:-2],
        "servedate": date
    }
    return info

# #print(parseItem(test_item1))
# #print(parseItem(test_item2))

# test_meal1 = menu_hoch[0]["groups"][0]["items"]
# test_meal2 = menu_hoch[1]["groups"][0]["items"]

# def parseByMeal(section):
#     '''iterate parseItem over a meal
#     return a list of dicts, with each dict being a menu item'''
#     return [parseItem(item) for item in section]

# #print(parseByMeal(test_meal1))
# #print(parseByMeal(test_meal2))

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

import re
from collections import Counter
import psycopg

DB_URL = "postgresql://user:password@localhost:5432/postgres"
TABLE = "menu_items_hoch"


def column_type(key, value):
    """Integers -> BIGINT; keys with a unit like '(g)' -> NUMERIC; else TEXT."""
    if isinstance(value, int):
        return "BIGINT"
    if re.search(r"\([^)]*\)\s*$", key):
        return "NUMERIC"
    return "TEXT"
 
 
def q(name):
    """Double-quote an identifier so names with spaces, '/' or '()' are kept as-is."""
    return '"' + name.replace('"', '""') + '"'
 
 
def load(data, db_url=DB_URL):
    # Every dict lists its keys in the same order, but a couple of records spell
    # a key slightly differently ('TotalLipid/Fat (g)', 'Vitamin D(mg)'). For each
    # position, use the dict key spelling most records share as the column name.
    key_lists = [list(rec.keys()) for rec in data]
    if len({len(keys) for keys in key_lists}) != 1:
        raise ValueError("Records do not all have the same number of keys.")
    columns = [Counter(keys).most_common(1)[0][0] for keys in zip(*key_lists)]
 
    first = data[0]
    types = [column_type(c, v) for c, v in zip(columns, first.values())]
    types[0] += " PRIMARY KEY"  # first key (itemID) is the primary key

    drop_sql = f"DROP TABLE IF EXISTS {q(TABLE)};"
    create_sql = "CREATE TABLE IF NOT EXISTS {} (\n    {}\n);".format(
        q(TABLE),
        ",\n    ".join(f"{q(c)} {t}" for c, t in zip(columns, types)),
    )
    insert_sql = (
        f"INSERT INTO {q(TABLE)} ({', '.join(q(c) for c in columns)}) "
        f"VALUES ({', '.join(['%s'] * len(columns))}) "
        f"ON CONFLICT ({q(columns[0])}) DO NOTHING"
    )
 
    # Values are taken in each dict's key order, which matches the columns.
    rows = [tuple(rec.values()) for rec in data]
 
    # psycopg 3: the `with` block commits and closes the connection.
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(drop_sql)  # start fresh: removes any older table and its data
            cur.execute(create_sql)
            cur.executemany(insert_sql, rows)
    print(f"Inserted {len(rows)} rows into {TABLE}.")

if __name__ == "__main__":
    load(parsedMenu)