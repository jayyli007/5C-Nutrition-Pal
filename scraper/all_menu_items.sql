-- all_menu_items: every dining hall's menu, every day, in one table.
-- Run once in Supabase -> SQL Editor. Safe to run again (it only adds what's missing).
--
-- One row per dining hall, date, meal and item. Columns match SCHEMA in menu_database.py.
-- The frontend reads today's menu with:
--   supabase.from('all_menu_items').select('*').eq('serve_date', today)

alter table public.all_menu_items
  add column if not exists dining_hall    text not null,   -- collins, malott, mcconnell, frank, frary, hoch
  add column if not exists serve_date     date not null,
  add column if not exists meal           text,            -- breakfast, brunch, lunch, dinner, ...
  add column if not exists station        text,
  add column if not exists item_id        text,            -- the source's own ID (null for Hoch)
  add column if not exists name           text,
  add column if not exists description    text,
  add column if not exists serving        text,
  add column if not exists calories       double precision,
  add column if not exists protein_g      double precision,
  add column if not exists carbs_g        double precision,
  add column if not exists fat_g          double precision,
  add column if not exists fiber_g        double precision,
  add column if not exists cholesterol_mg double precision,
  add column if not exists sodium_mg      double precision,
  add column if not exists sugar_g        double precision,
  add column if not exists is_vegan       boolean,         -- null = the hall didn't say
  add column if not exists is_vegetarian  boolean,
  add column if not exists is_gluten_free boolean,
  add column if not exists peanut         boolean,
  add column if not exists tree_nut       boolean,
  add column if not exists milk           boolean,
  add column if not exists egg            boolean,
  add column if not exists soy            boolean,
  add column if not exists sesame         boolean,
  add column if not exists fish           boolean,
  add column if not exists shellfish      boolean,
  add column if not exists wheat          boolean,
  -- Bon Appetit halls only (collins, malott, mcconnell): 1 = "Specials" (main dishes),
  -- 2 = "Additional Favorites" (deli, grill basics, drinks), 3 = "Condiments and Extras"
  -- (salad bar, cereal, toppings). Null for the other halls. The app shows tier 1 first.
  add column if not exists tier           smallint;

-- the app almost always asks "this date, maybe this hall"
create index if not exists all_menu_items_date_hall_idx
  on public.all_menu_items (serve_date, dining_hall);

-- anyone (the app's public key) can read; only the scraper's secret key can write
alter table public.all_menu_items enable row level security;
drop policy if exists "Menus are readable by everyone" on public.all_menu_items;
create policy "Menus are readable by everyone"
  on public.all_menu_items for select
  to anon, authenticated
  using (true);

-- Swap one hall's menu for one day in a single transaction, so a rerun replaces
-- that day instead of duplicating it, and a failed upload leaves the old rows in place.
create or replace function public.replace_menu_day(p_serve_date date, p_dining_hall text, p_rows jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  inserted integer;
begin
  delete from all_menu_items
   where serve_date = p_serve_date and dining_hall = p_dining_hall;

  insert into all_menu_items (
    dining_hall, serve_date, meal, station, item_id, name, description, serving,
    calories, protein_g, carbs_g, fat_g, fiber_g, cholesterol_mg, sodium_mg, sugar_g,
    is_vegan, is_vegetarian, is_gluten_free,
    peanut, tree_nut, milk, egg, soy, sesame, fish, shellfish, wheat, tier)
  select
    p_dining_hall, p_serve_date, meal, station, item_id, name, description, serving,
    calories, protein_g, carbs_g, fat_g, fiber_g, cholesterol_mg, sodium_mg, sugar_g,
    is_vegan, is_vegetarian, is_gluten_free,
    peanut, tree_nut, milk, egg, soy, sesame, fish, shellfish, wheat, tier
  from jsonb_populate_recordset(null::all_menu_items, p_rows);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- only the scraper (service role) may call it
revoke execute on function public.replace_menu_day(date, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_menu_day(date, text, jsonb) to service_role;

-- make the API see the new columns and function right away
notify pgrst, 'reload schema';
