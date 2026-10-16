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
'''

import requests
import json
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

def parseItem(itemDict):
    '''parse one item in the json file
    returns a dict of the important description and nutrient columns'''
    item = itemDict
    nutrition = item["nutrition_details"]

    if nutrition == {}:
        info = {
        "itemID": item["id"],
        "category": item["station"],
        "meal": item["meals"],
        "description": item["description"],
        "shortName": item["label"],
        "serving": None,
        "Calories (kcal)": None,
        "Total Lipid/Fat (g)": None,
        "Saturated fatty acid (g)": None,
        "Trans Fat (g)": None,
        "Cholesterol (mg)": None,
        "Sodium (mg)": None,
        "Carbohydrates (g)": None,
        "Total Dietary Fiber (g)": None,
        "Total Sugars (g)": None,
        "servedate": date
        }
        return info #for items without any nutrition info
    
    info = {
        "itemID": item["id"],
        "category": item["station"],
        "meal": item["meals"],
        "description": item["description"],
        "shortName": item["label"],
        "serving": nutrition["servingSize"]["value"] + " " + nutrition["servingSize"]["unit"],
        "Calories (kcal)": nutrition["calories"]["value"],
        "Total Lipid/Fat (g)": nutrition["fatContent"]["value"],
        "Saturated fatty acid (g)": nutrition["saturatedFatContent"]["value"],
        "Trans Fat (g)": nutrition["transFatContent"]["value"],
        "Cholesterol (mg)": nutrition["cholesterolContent"]["value"], #other jsons use grams, not mg
        "Sodium (mg)": nutrition["sodiumContent"]["value"],
        "Carbohydrates (g)": nutrition["carbohydrateContent"]["value"],
        "Total Dietary Fiber (g)": nutrition["fiberContent"]["value"],
        "Total Sugars (g)": nutrition["sugarContent"]["value"],
        # "Protein (g)": nutrition["proteinContent"]["value"],
        # "Vitamin C (mg)": item["vitaminC"][:-2],
        # "Calcium (mg)": item["calcium"][:-2],
        "servedate": date
    }
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

from collections import Counter
import psycopg

DB_URL = "postgresql://postgres:rank35Sprout@localhost:5432/postgres"
TABLE = "menu_items_collins"


def q(name):
    """Double-quote an identifier so names with spaces, '/' or '()' are kept as-is."""
    return '"' + name.replace('"', '""') + '"'


def load(data, TABLE, db_url=DB_URL):
    key_lists = [list(rec.keys()) for rec in data]
    if len({len(keys) for keys in key_lists}) != 1:
        raise ValueError("Records do not all have the same number of keys.")
    columns = [Counter(keys).most_common(1)[0][0] for keys in zip(*key_lists)]

    types = ["TEXT"] * len(columns)
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

    # Everything becomes a string; None stays NULL.
    rows = [tuple(None if v is None else str(v) for v in rec.values()) for rec in data]

    # psycopg 3: the `with` block commits and closes the connection.
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(drop_sql)  # start fresh: removes any older table and its data
            cur.execute(create_sql)
            cur.executemany(insert_sql, rows)
    print(f"Inserted {len(rows)} rows into {TABLE}.")


# if __name__ == "__main__":
#     load(parsedMenu_collins, "menu_items_collins")
#     load(parsedMenu_malott, "menu_items_malott")
#     load(parsedMenu_mcconnel, "menu_items_mcconnel")