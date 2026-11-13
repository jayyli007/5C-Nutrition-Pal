#most of the individual parsers should already account for these things, but fix any errors that you see
'''
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
    '''

from hoch.hoch import parsedMenu as parsedMenu_hoch
from bonappetit.bonappetit import parsedMenu_collins, parsedMenu_malott, parsedMenu_mcconnel
from frank_frary.pomona import MENU_FRANK as parsedMenu_frank
from frank_frary.pomona import MENU_FRARY as parsedMenu_frary

parsedMenu_all = parsedMenu_hoch + parsedMenu_collins + parsedMenu_malott + parsedMenu_mcconnel + parsedMenu_frank + parsedMenu_frary

keyss = ["dining_hall", "itemID", "category", "meal", "description", "shortName", "serving",
        "Calories (kcal)", "Total Lipid/Fat (g)", "Cholesterol (mg)", "Sodium (mg)", "Carbohydrates (g)",
        "Total Dietary Fiber (g)", "Total Sugars (g)", "Protein (g)", "Vegan", "Vegetarian", "Gluten Free",
        "Peanut", "Tree nut", "Milk", "Egg", "Soy", "Sesame", "Fish", "Shellfish", "Wheat", "servedate"]

same_keys = all(d.keys() == set(keyss) for d in parsedMenu_all)
assert same_keys == True

# expected = set(keyss)
# for i, d in enumerate(parsedMenu_all):
#     keys = set(d)
#     if keys != expected:
#         print(f"Row {i}: missing {expected - keys}, extra {keys - expected}")

"""
This uploads data to supabase directly, instead of using psycopg (which had some errors on my end)
You will have to set .env variables as described below to upload data into supabase

ONE-TIME SETUP
1) python -m pip install supabase python-dotenv
2) In Supabase -> SQL Editor, run create_menu_table.sql once.
3) Create scraper/.env (same folder as this file) with:
       SUPABASE_URL=https://YOURREF.supabase.co
       SUPABASE_KEY=sb_secret_...      (or the legacy service_role key)
   Both are in Project Settings -> API Keys, and you can copy them again any time.
"""
import json
import os
import time
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent

load_dotenv(SCRIPT_DIR / ".env", override=True)
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

RESERVED = {"row_id", "inserted_at"}
BATCH_SIZE = 500
REPLACE_TABLE = True   # True = rebuild today's table each run; False = add rows to it


# ---------- helpers ----------

def pg_type(value):
    """Pick a Postgres column type from a Python value."""
    if isinstance(value, bool):          # before int (bool is a subclass of int)
        return "boolean"
    if isinstance(value, int):
        return "bigint"
    if isinstance(value, float):
        return "double precision"
    if isinstance(value, (dict, list)):
        return "jsonb"
    if isinstance(value, datetime):      # before date
        return "timestamptz"
    if isinstance(value, date):
        return "date"
    return "text"


def infer_columns(items):
    """Return {column_name: pg_type} in first-seen key order, across ALL dicts."""
    columns = {}
    for row in items:
        for key, value in row.items():
            if key in RESERVED:
                raise ValueError(f"Your data already has a '{key}' key; rename it, it's reserved.")
            if value is None:
                columns.setdefault(key, None)
                continue
            new_type = pg_type(value)
            old_type = columns.get(key)
            if old_type is None:
                columns[key] = new_type
            elif old_type != new_type:
                if {old_type, new_type} == {"bigint", "double precision"}:
                    columns[key] = "double precision"
                else:
                    columns[key] = "text"
    return {k: (t or "text") for k, t in columns.items()}   # all-None columns become text


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
    return value                          # dicts/lists go to jsonb as-is


# ---------- upload ----------

def insert_with_retry(table_name, batch, attempts=10):
    """A brand-new table can take a moment to appear in the API; retry until it does."""
    for i in range(attempts):
        try:
            return supabase.table(table_name).insert(batch).execute()
        except Exception as e:
            not_ready = "PGRST205" in str(e) or "schema cache" in str(e)
            if not_ready and i < attempts - 1:
                time.sleep(1)
                continue
            raise


def upload_menu_items(items, table_name=None, replace=REPLACE_TABLE):
    """Create today's table if needed (adding any new columns), then insert every dict."""
    items = [row for row in items if row]
    if not items:
        print("Nothing to upload.")
        return None

    table_name = table_name or f"menu_items_{date.today():%m-%d-%Y}"
    columns = infer_columns(items)

    # 1) create the table (or add new columns) via the SQL function you installed once
    supabase.rpc("create_menu_table", {
        "table_name": table_name,
        "columns": [{"name": c, "type": t} for c, t in columns.items()],
        "replace_table": replace,
    }).execute()

    # 2) insert in batches; every row gets every column so the batch is consistent
    rows = [{c: to_json_value(item.get(c), t) for c, t in columns.items()} for item in items]
    for start in range(0, len(rows), BATCH_SIZE):
        insert_with_retry(table_name, rows[start:start + BATCH_SIZE])

    print(f"Inserted {len(rows)} rows into {table_name}")
    return table_name


# ---------- your menus ----------
# Keep your existing imports here, exactly as you had them, e.g.:
#   from hoch.hoch import parsedMenu as parsedMenu_hoch
#   from collins.collins import parsedMenu as parsedMenu_collins
#   parsedMenu_all = parsedMenu_hoch + parsedMenu_collins

if __name__ == "__main__":
    upload_menu_items(parsedMenu_all)