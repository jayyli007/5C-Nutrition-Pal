'''
Notes to reader:
The extraction section takes the json from the dining hall websites and cuts out small unimportant bits to make the data readable in python
The parsing section turns the data into a (list of (list of dict)) where the outside list lists by location,
the inside list lists by menu item, and the dict contains all the descriptive & nutritional info for each menu item
The upload section uploads the python data into SQL

If you want to visualize the data in a table, change DB_URL to the correct database url and uncomment the last if statement

Issues that have not yet been fixed (but will be soon):
filter out all menu items with calories over 1000
filter out all menu items with no nutritional info (this looks like [null] in SQL, None in python, and NA in the original json string)
filter by servedate to only include the menu for the current day
'''




import requests
import json

#extraction--------------------------------

url_frank = "https://api.pomona.edu/eatec/Frank.json"
url_frary = "https://api.pomona.edu/eatec/Frary.json"


def cleanJSON(url):
    '''makes the given json parsable by extracting the parts that matter
    abstracting for frank or frary'''
    response = requests.get(url, timeout=10)
    text = response.text
    start = text.find("{")
    end = text.rfind("}") #text is a jsonp file, json file is in between the {}

    if start == -1 or end == -1 or end < start:
        raise ValueError(f"No JSON object found: {text[:200]!r}")

    data = json.loads(text[start:end + 1])
    finalMenu = (data["EatecExchange"])["menu"]
    return finalMenu

menu_frank = cleanJSON(url_frank)
menu_frary = cleanJSON(url_frary)

#len(menu)=107 because the list menu has 107 elements as of 10/10/2026
#with each entry separated by location (they're separated for meals & day, but location is the lowest level)
#recipes: and recipe: are the same thing; they both separate by location

#parsing------------------------------------

#one menu item to test parseItem
testItem = menu_frank[0]["recipes"]["recipe"][0]

NUTRIENT_LABELS = (
    "Calories (kcal)~CAL|Total Lipid/Fat (g)~TL|Saturated fatty acid (g)~FAS|"
    "Trans Fat (g)~TRF|Cholesterol (mg)~CHO|Sodium (mg)~Na|Carbohydrate (g)~CRB|"
    "Total Dietary Fiber (g)~FIB|Total Sugars (g)~SUG|Added Sugar (g)~SugA|"
    "Protein (g)~PRO|Vitamin C (mg)~vC|Calcium (mg)~CA|Iron (mg)~Fe|"
    "Vitamin A (mcg RAE)~(rae)|Phosphorus (mg)~PHO|Potassium (mg)~K|Vitamin D(iu)~VITD"
)

#the output style of this function can be changed into anything
#the structure is: (Dict description + nutrients))
def parseItem(recipeDict):
    '''recipeDict is one of the elements from the line "recipe" : {...}
    each dict is a specific menu item'''
    recipe = recipeDict
 
    info = {
        "itemID": recipe["@id"],
        "category": recipe["@category"],
        "menuPosition": recipe["@menuPosition"],
        "description": recipe["@description"],
        "shortName": recipe["@shortName"],
        "servingDescription": recipe["@servingDescription"],
    }
 
    labels = [entry.split("~")[0] for entry in NUTRIENT_LABELS.split("|")]
    if "@nutrients" in recipe:
        values = recipe["@nutrients"].split("|")
    else:
        print(recipe["@shortName"] + " has no nutrients data")
        return None #the item does not have nutrients data, so we skip it
 
    info_nutrients = info
    for i, label in enumerate(labels):
        if i < len(values) and values[i] != "NA":
            info_nutrients[label] = float(values[i])
        else:
            info_nutrients[label] = None
 
    return info_nutrients

#testing the first item in the json
#print(parseItem(testItem))

testLocation0 = menu_frank[0]
testLocation1 = menu_frank[1]
testLocation2 = menu_frank[2]

#I will leave the parsers like this until we know which data types we want to return
#and if we decide on a database to store this data
#I will easily be able to iterate parseLocation over the ~100 locations across meals afterwards
def parseLocation(locationDict):
    '''Parses the menu items in one location of frank
    each element of the value of "menu": is a location
    list of the outputs of parseItem with id, servedate, meal appended onto every dict'''
    location = locationDict
    info = {
        "locationID": location["@id"],
        "servedate": location["@servedate"],
        "location": location["@location"],
        "meal": location["@mealperiodname"]
    }

    if "closed" in location["recipes"]:
        #dining hall is closed that day, there is no "recipe" key instead there is a "closed" key
        return None
    elif "recipe" in location["recipes"]:
        itemsFile = location["recipes"]["recipe"]


    if isinstance(itemsFile, list):
        returnItems = [{**parseItem(item), **info} for item in itemsFile if parseItem(item) != None]
        return returnItems
    elif isinstance(itemsFile, dict):
        print("Skipped over " + itemsFile["@category"] + " in " + location["@mealperiodname"] + " on " + location["@servedate"] +
              " due to it being a category without any items")
        return None
        #in the case where there's a category with 0 items with nutritional info in them, commonly found in expo station

#testing the first location in the json
#print(parseLocation(testLocation0))
#print(parseLocation(testLocation1))
#print(parseLocation(testLocation2))


def entireMenu(entireMenu):
    return [parseLocation(location) for location in entireMenu if parseLocation(location) != None]


#upload----------------------------------------------------------------
import re
from datetime import date, datetime

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb


DB_URL = "postgresql://user:password@localhost:5432/postgres" #change this url to reflect the database you want the data to be stsored in
TABLE_NAME_FRANK = "menu_items_frank"
TABLE_NAME_FRARY = "menu_items_frary"
REPLACE_TABLE = True   # False = keep existing rows and append new ones

# Which key holds the item's name. If it isn't found, the first of the
# fallbacks that exists in the data is used instead.
NAME_KEY = "shortName"
NAME_FALLBACKS = ["short_name", "name", "item_name", "description"]
MENU_FRANK = entireMenu(menu_frank)
MENU_FRARY = entireMenu(menu_frary)


def get_name(item):
    for key in [NAME_KEY, *NAME_FALLBACKS]:
        if key in item:
            return item[key]
    return None


# Python type of a value -> Postgres column type.
# This only checks what type the value already is
PG_TYPES = {
    str: "text",
    int: "bigint",
    float: "double precision",
    bool: "boolean",
}
EMPTY_COLUMN_TYPE = "double precision"   # used when a key is None in every item


def load_menus(menus, table, db_url=DB_URL, replace=REPLACE_TABLE):
    tbl = sql.Identifier(table)

    # Flatten the list of menus into one list of item dicts.
    # (If MENUS is already a flat list of dicts, use: items = list(menus))
    items = [item for menu in menus for item in menu]
    if not items:
        print("No rows to insert.")
        return 0

    #collect all keys in order
    keys = []
    for item in items:
        for key in item:
            if key not in keys:
                keys.append(key)

    #pick a postgres key type from the types in python
    col_types = {}
    for key in keys:
        first_value = next((item[key] for item in items
                            if item.get(key) is not None), None)
        if first_value is None:
            col_types[key] = EMPTY_COLUMN_TYPE #if all python types are none, this is the postgres type we give the column
        else:
            col_types[key] = PG_TYPES.get(type(first_value), "text")

    with psycopg.connect(db_url) as conn:  #commits on clean exit
        with conn.cursor() as cur:
            if replace:
                cur.execute(sql.SQL("DROP TABLE IF EXISTS {}").format(tbl))

            #row_id is different from itemID, it's used for increments
            #this creates a table with columns for each key in each dict for each item
            column_defs = sql.SQL(",\n    ").join(
                sql.SQL("{} {}").format(sql.Identifier(key), sql.SQL(col_types[key]))
                for key in keys
            )
            cur.execute(sql.SQL("""
                CREATE TABLE IF NOT EXISTS {} (
                    row_id      bigserial PRIMARY KEY,
                    {},
                    inserted_at timestamptz NOT NULL DEFAULT now()
                )
            """).format(tbl, column_defs))

            #if replace = False, we append more columns onto the existing table instead of replacing columns
            if not replace:
                for key in keys:
                    cur.execute(
                        sql.SQL("ALTER TABLE {} ADD COLUMN IF NOT EXISTS {} {}").format(
                            tbl, sql.Identifier(key), sql.SQL(col_types[key])
                        )
                    )

            #insert column names into postgres
            insert = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                tbl,
                sql.SQL(", ").join(sql.Identifier(key) for key in keys),
                sql.SQL(", ").join(sql.Placeholder() for _ in keys),
            )

            #create tuples for each menu item and insert them into the table
            rows = [tuple(item.get(key) for key in keys) for item in items]
            cur.executemany(insert, rows)

    print(f"Inserted {len(rows)} rows into {table} with {len(keys)} columns.")
    return len(rows)

# if __name__ == "__main__":
#     load_menus(MENU_FRANK, TABLE_NAME_FRANK)
#     load_menus(MENU_FRARY, TABLE_NAME_FRARY)

#uncomment this last if statement to load in the data from python to SQL to visualize it
#you will need to change the url to match the desired SQL server