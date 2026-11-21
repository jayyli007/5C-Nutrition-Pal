// Dining hall menus from Supabase's all_menu_items table (filled daily by scraper/menu_database.py).
// Column names match SCHEMA in menu_database.py and scraper/all_menu_items.sql.
//
// Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (local dev), the app uses the sample menus at the
// bottom of this file instead, shaped the same way, and screens say they're samples.

import { useEffect, useState } from 'react'
import { HALLS, type Hall, type Meal, type TrackableId } from './onboarding'
import { dayKey, type Nutrients } from './store'
import { supabase } from './supabase'

export const usingSampleMenus = supabase == null

const ALLERGEN_COLUMNS = ['peanut', 'tree_nut', 'milk', 'egg', 'soy', 'sesame', 'fish', 'shellfish', 'wheat'] as const
type AllergenColumn = (typeof ALLERGEN_COLUMNS)[number]
type FlagColumn = AllergenColumn | 'is_vegan' | 'is_vegetarian' | 'is_gluten_free'

/** One row of all_menu_items, plus `key`, a client-side id that's unique within one fetched menu. */
export type MenuRow = {
  key: string
  dining_hall: string
  serve_date: string
  meal: string | null
  station: string | null
  item_id: string | null
  name: string | null
  description: string | null
  serving: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  cholesterol_mg: number | null
  sodium_mg: number | null
  sugar_g: number | null
  /**
   * Bon Appétit halls only: 1 "Specials" (main dishes), 2 "Additional Favorites" (deli, grill basics, drinks),
   * 3 "Condiments and Extras" (salad bar, cereal, toppings). Null for other halls, and missing until the tier
   * column is added in Supabase.
   */
  tier?: number | null
} & Record<FlagColumn, boolean | null> // null = the hall didn't say

// ---- Names: the UI capitalizes, the database stores lowercase ---------------

/** UI hall name -> all_menu_items.dining_hall. */
export const dbHall = (hall: Hall) => hall.toLowerCase()
/** UI meal name -> all_menu_items.meal. */
export const dbMeal = (meal: Meal) => meal.toLowerCase()
/** Every all_menu_items.meal value that belongs under a UI meal (Collins also serves a "continental breakfast"). */
export const dbMeals = (meal: Meal): string[] => (meal === 'Breakfast' ? ['breakfast', 'continental breakfast'] : [dbMeal(meal)])

/** Halls a scraper fills. The others (Oldenborg) are in the UI but have no menu data yet. */
export const HALLS_WITH_MENUS: readonly Hall[] = ['Frary', 'Frank', 'Collins', 'Malott', 'Hoch', 'McConnell']

// ---- Reading a row ---------------------------------------------------------

/** Which column holds each nutrient the app tracks. Saturated fat isn't scraped yet, so it's never filled. */
const COLUMN_FOR: Partial<Record<TrackableId, keyof MenuRow>> = {
  calories: 'calories',
  protein: 'protein_g',
  carbs: 'carbs_g',
  fat: 'fat_g',
  fiber: 'fiber_g',
  sugar: 'sugar_g',
  sodium: 'sodium_mg',
}

export function rowNutrients(row: MenuRow): Nutrients {
  const out: Nutrients = {}
  for (const [id, col] of Object.entries(COLUMN_FOR) as [TrackableId, keyof MenuRow][]) {
    const v = row[col]
    if (typeof v === 'number' && Number.isFinite(v)) out[id] = v
  }
  return out
}

export const rowName = (row: MenuRow) => row.name ?? 'Unnamed item'
export const rowStation = (row: MenuRow) => row.station ?? 'Other'

/** A main dish: Bon Appétit "Specials", or any item from a hall that doesn't rank its items. */
export const isFeatured = (row: MenuRow) => row.tier == null || row.tier === 1
const tierRank = (row: MenuRow) => row.tier ?? 1

/** The user's allergen chips (onboarding names) -> allergen columns. */
export const ALLERGEN_COLUMN: Record<string, AllergenColumn> = {
  Milk: 'milk',
  Eggs: 'egg',
  Peanuts: 'peanut',
  'Tree nuts': 'tree_nut',
  Fish: 'fish',
  Shellfish: 'shellfish',
  Wheat: 'wheat',
  Soy: 'soy',
  Sesame: 'sesame',
}

/** Allergens from the user's list that this dish contains. */
export function allergensIn(row: MenuRow, allergens: string[]): string[] {
  return allergens.filter((a) => ALLERGEN_COLUMN[a] && row[ALLERGEN_COLUMN[a]] === true)
}

/** Allergens from the user's list that the hall doesn't report for this dish (null), so it might contain them. */
export function allergensUnknown(row: MenuRow, allergens: string[]): string[] {
  return allergens.filter((a) => ALLERGEN_COLUMN[a] && row[ALLERGEN_COLUMN[a]] == null)
}

/** Whether a dish is known to fit every dietary preference we can check. Unknown (null) counts as not fitting. */
export function fitsDiet(row: MenuRow, dietary: string[]): boolean {
  return dietary.every((d) => {
    switch (d) {
      case 'Vegan':
        return row.is_vegan === true
      case 'Vegetarian':
        return row.is_vegetarian === true || row.is_vegan === true
      case 'Pescatarian':
        return row.is_vegetarian === true || row.is_vegan === true || row.fish === true || row.shellfish === true
      case 'Gluten-free':
        return row.is_gluten_free === true
      case 'Dairy-free':
        return row.milk === false
      default:
        return true // Halal and Kosher aren't in the menu data yet.
    }
  })
}

// ---- Fetching --------------------------------------------------------------

const PAGE = 1000 // PostgREST's default max rows per request

type RawRow = Omit<MenuRow, 'key'>

async function fetchRows(date: string, meals: string[], hall?: string): Promise<RawRow[]> {
  const out: RawRow[] = []
  for (let from = 0; ; from += PAGE) {
    // select('*') rather than a column list, so a column the database doesn't have yet (like tier) can't break the query.
    let q = supabase!.from('all_menu_items').select('*').eq('serve_date', date).in('meal', meals)
    if (hall) q = q.eq('dining_hall', hall)
    const { data, error } = await q.order('dining_hall').order('station').order('name').range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data as unknown as RawRow[]))
    if (!data || data.length < PAGE) return out
  }
}

const withKeys = (rows: RawRow[]): MenuRow[] => rows.map((r, i) => ({ ...r, key: `${r.dining_hall}|${r.meal}|${r.item_id ?? ''}|${r.name ?? ''}|${i}` }))

// Cached per date + meal (+ hall) so switching chips back and forth doesn't refetch. Failed fetches are dropped so Retry works.
const cache = new Map<string, Promise<MenuRow[]>>()

function cached(key: string, load: () => Promise<MenuRow[]>): Promise<MenuRow[]> {
  let p = cache.get(key)
  if (!p) {
    p = load()
    cache.set(key, p)
    p.catch(() => cache.delete(key))
  }
  return p
}

/** One hall's menu for one meal and day. */
export function getMenu(hall: Hall, meal: Meal, date = new Date()): Promise<MenuRow[]> {
  if (!supabase) return Promise.resolve(sampleMenu(hall, meal, date))
  if (!HALLS_WITH_MENUS.includes(hall)) return Promise.resolve([])
  const day = dayKey(date)
  return cached(`${day}|${meal}|${hall}`, async () => withKeys(await fetchRows(day, dbMeals(meal), dbHall(hall))))
}

/** Every hall's menu for one meal and day, as [UI hall name, rows]. */
export function getMealAllHalls(meal: Meal, date = new Date()): Promise<{ hall: Hall; row: MenuRow }[]> {
  if (!supabase) return Promise.resolve(HALLS.flatMap((hall) => sampleMenu(hall, meal, date).map((row) => ({ hall, row }))))
  const day = dayKey(date)
  const byDb = new Map(HALLS.map((h) => [dbHall(h), h]))
  return cached(`${day}|${meal}|*`, async () => withKeys(await fetchRows(day, dbMeals(meal)))).then((rows) =>
    rows.flatMap((row) => {
      const hall = byDb.get(row.dining_hall)
      return hall ? [{ hall, row }] : []
    }),
  )
}

export type MenuState<T> = { status: 'loading' } | { status: 'error'; message: string; retry: () => void } | { status: 'ready'; rows: T[] }

/** Load a menu in a component: loading, then ready or error (with retry). Reloads when `deps` change. */
export function useMenu<T>(load: () => Promise<T[]>, deps: unknown[]): MenuState<T> {
  const [state, setState] = useState<MenuState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    load().then(
      (rows) => live && setState({ status: 'ready', rows }),
      (e: unknown) => live && setState({ status: 'error', message: e instanceof Error ? e.message : String(e), retry: () => setAttempt((n) => n + 1) }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])
  return state
}

/**
 * Rows grouped by station. Stations with a main dish come first (so the salad bar and condiments sink to the
 * bottom), then hot stations, then alphabetical. Within a station, main dishes come first, then by tier;
 * otherwise rows keep their order.
 */
export function byStation(rows: MenuRow[]): [string, MenuRow[]][] {
  const groups = new Map<string, MenuRow[]>()
  for (const r of rows) groups.set(rowStation(r), [...(groups.get(rowStation(r)) ?? []), r])
  const rank = (s: string) => {
    const i = STATION_ORDER.indexOf(s)
    return i === -1 ? STATION_ORDER.length : i
  }
  const noMain = (items: MenuRow[]) => Number(!items.some(isFeatured))
  return [...groups]
    .map(([s, items]) => [s, [...items].sort((a, b) => tierRank(a) - tierRank(b))] as [string, MenuRow[]])
    .sort((a, b) => noMain(a[1]) - noMain(b[1]) || rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
}

// Hot food first, sides and sweets last. Real station names vary by hall; unknown ones sort alphabetically after these.
const STATION_ORDER = ['Breakfast', 'Grill', 'Mainline', 'Wok', 'Pasta', 'Pizza', 'Deli', 'Soup', 'Vegan', 'Salad bar', 'Bakery']

// ---- Sample menus (no Supabase configured, and /?demo history) --------------

type Flag = 'Vegan' | 'Vegetarian' | 'Gluten Free' | 'Peanut' | 'Tree Nut' | 'Milk' | 'Egg' | 'Soy' | 'Sesame' | 'Fish' | 'Shellfish' | 'Wheat'

const FLAG_COLUMN: Record<Flag, FlagColumn> = {
  Vegan: 'is_vegan',
  Vegetarian: 'is_vegetarian',
  'Gluten Free': 'is_gluten_free',
  Peanut: 'peanut',
  'Tree Nut': 'tree_nut',
  Milk: 'milk',
  Egg: 'egg',
  Soy: 'soy',
  Sesame: 'sesame',
  Fish: 'fish',
  Shellfish: 'shellfish',
  Wheat: 'wheat',
}

// name, station, meals (B breakfast, R brunch, L lunch, D dinner), kcal, protein, carbs, fat, fiber, sugar, sodium, sat fat, serving, flags
type Dish = [string, string, string, number, number, number, number, number, number, number, number, string, Flag[]]

const DISHES: Dish[] = [
  ['Scrambled eggs', 'Breakfast', 'BR', 180, 13, 2, 13, 0, 1, 190, 4, '1/2 cup', ['Vegetarian', 'Gluten Free', 'Egg', 'Milk']],
  ['Buttermilk pancakes', 'Breakfast', 'BR', 320, 8, 52, 9, 2, 14, 520, 3, '3 each', ['Vegetarian', 'Egg', 'Milk', 'Wheat']],
  ['Turkey sausage', 'Breakfast', 'BR', 140, 12, 1, 10, 0, 1, 410, 3, '2 links', ['Gluten Free']],
  ['Steel-cut oatmeal', 'Breakfast', 'B', 150, 5, 27, 3, 4, 1, 10, 0, '1 cup', ['Vegan', 'Vegetarian']],
  ['Greek yogurt parfait', 'Breakfast', 'BR', 240, 15, 33, 5, 2, 22, 70, 2, '1 cup', ['Vegetarian', 'Milk', 'Tree Nut']],
  ['Tofu scramble', 'Breakfast', 'BR', 190, 15, 6, 12, 2, 1, 330, 2, '3/4 cup', ['Vegan', 'Vegetarian', 'Gluten Free', 'Soy']],
  ['Breakfast burrito', 'Breakfast', 'BR', 480, 22, 44, 23, 3, 2, 980, 9, '1 each', ['Egg', 'Milk', 'Wheat']],
  ['Hash brown potatoes', 'Breakfast', 'BR', 160, 2, 21, 8, 2, 0, 290, 1, '1/2 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Avocado toast', 'Bakery', 'BR', 290, 8, 30, 16, 7, 3, 380, 2, '1 slice', ['Vegan', 'Vegetarian', 'Wheat']],
  ['Blueberry muffin', 'Bakery', 'BRL', 380, 5, 54, 16, 1, 30, 330, 3, '1 each', ['Vegetarian', 'Egg', 'Milk', 'Wheat']],
  ['Fresh fruit cup', 'Salad bar', 'BRLD', 70, 1, 18, 0, 2, 14, 0, 0, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Chicken shawarma', 'Grill', 'LD', 430, 36, 28, 18, 2, 3, 760, 4, '1 plate', ['Gluten Free', 'Sesame']],
  ['Black bean burger', 'Grill', 'LD', 380, 19, 46, 13, 9, 5, 640, 2, '1 each', ['Vegan', 'Vegetarian', 'Wheat', 'Soy']],
  ['Classic cheeseburger', 'Grill', 'LD', 610, 34, 40, 34, 2, 8, 980, 15, '1 each', ['Milk', 'Wheat', 'Sesame']],
  ['Sweet potato fries', 'Grill', 'LD', 260, 3, 36, 12, 4, 7, 300, 1, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Grilled chicken breast', 'Grill', 'LD', 190, 35, 0, 4, 0, 0, 380, 1, '4 oz', ['Gluten Free']],
  ['Quinoa salad', 'Salad bar', 'LD', 220, 7, 32, 7, 5, 4, 260, 1, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Caesar salad', 'Salad bar', 'LD', 280, 8, 14, 21, 3, 2, 520, 5, '2 cups', ['Fish', 'Egg', 'Milk', 'Wheat']],
  ['Hummus and pita', 'Salad bar', 'L', 260, 9, 34, 10, 6, 1, 420, 1, '1/2 cup', ['Vegan', 'Vegetarian', 'Sesame', 'Wheat']],
  ['Spinach and feta salad', 'Salad bar', 'LD', 180, 7, 9, 13, 3, 4, 410, 5, '2 cups', ['Vegetarian', 'Gluten Free', 'Milk']],
  ['Margherita pizza', 'Pizza', 'LD', 290, 12, 34, 11, 2, 3, 610, 5, '1 slice', ['Vegetarian', 'Milk', 'Wheat']],
  ['Pepperoni pizza', 'Pizza', 'LD', 330, 14, 34, 15, 2, 3, 760, 6, '1 slice', ['Milk', 'Wheat']],
  ['Turkey pesto panini', 'Deli', 'L', 520, 31, 46, 23, 3, 4, 1190, 7, '1 each', ['Milk', 'Wheat', 'Tree Nut']],
  ['Veggie wrap', 'Deli', 'L', 410, 13, 52, 17, 7, 5, 820, 4, '1 each', ['Vegetarian', 'Wheat', 'Milk']],
  ['Tomato basil soup', 'Soup', 'LD', 160, 4, 20, 7, 3, 11, 690, 3, '1 cup', ['Vegetarian', 'Gluten Free', 'Milk']],
  ['Chicken tortilla soup', 'Soup', 'LD', 190, 15, 17, 7, 3, 3, 840, 2, '1 cup', ['Gluten Free']],
  ['Salmon, lemon dill', 'Mainline', 'D', 360, 34, 4, 22, 0, 1, 320, 4, '5 oz', ['Gluten Free', 'Fish']],
  ['Beef and broccoli', 'Mainline', 'D', 410, 31, 22, 21, 3, 9, 880, 7, '1 cup', ['Soy', 'Wheat']],
  ['Chickpea tikka masala', 'Mainline', 'LD', 340, 12, 44, 13, 10, 8, 610, 5, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Steamed jasmine rice', 'Mainline', 'LD', 200, 4, 45, 0, 1, 0, 0, 0, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Roast turkey breast', 'Mainline', 'D', 170, 30, 1, 5, 0, 0, 450, 1, '4 oz', ['Gluten Free']],
  ['Shrimp pad thai', 'Wok', 'LD', 520, 24, 66, 18, 3, 16, 1240, 3, '1 bowl', ['Shellfish', 'Egg', 'Peanut', 'Soy']],
  ['Teriyaki tofu bowl', 'Wok', 'LD', 450, 21, 62, 13, 5, 14, 1020, 2, '1 bowl', ['Vegan', 'Vegetarian', 'Soy', 'Wheat', 'Sesame']],
  ['Pasta primavera', 'Pasta', 'LD', 430, 14, 64, 13, 6, 7, 540, 4, '1 1/2 cups', ['Vegetarian', 'Wheat', 'Milk']],
  ['Spaghetti and meatballs', 'Pasta', 'D', 590, 29, 68, 21, 5, 10, 1030, 8, '1 1/2 cups', ['Egg', 'Milk', 'Wheat']],
  ['Roasted vegetables', 'Vegan', 'LD', 110, 3, 14, 5, 4, 6, 190, 1, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Lentil stew', 'Vegan', 'LD', 230, 14, 36, 3, 13, 4, 480, 0, '1 cup', ['Vegan', 'Vegetarian', 'Gluten Free']],
  ['Chocolate chip cookie', 'Bakery', 'LD', 210, 2, 28, 10, 1, 17, 160, 6, '1 each', ['Vegetarian', 'Egg', 'Milk', 'Wheat', 'Soy']],
]

const MEAL_CODE: Record<Meal, string> = { Breakfast: 'B', Brunch: 'R', Lunch: 'L', Dinner: 'D' }

/** Small stable hash so each hall gets its own, repeatable mix of dishes. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function sampleRow(dish: Dish, hall: Hall, meal: Meal, i: number, servedate: string): MenuRow {
  const [name, station, , kcal, protein, carbs, fat, fiber, sugar, sodium, , serving, flags] = dish
  const row: MenuRow = {
    key: `sample|${hall}|${meal}|${i}`,
    dining_hall: dbHall(hall),
    serve_date: servedate,
    meal: dbMeal(meal),
    station,
    item_id: String(100000 + HALLS.indexOf(hall) * 10000 + i * 10 + Object.keys(MEAL_CODE).indexOf(meal)),
    name,
    description: null,
    serving,
    calories: kcal,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    cholesterol_mg: null,
    sodium_mg: sodium,
    sugar_g: sugar,
    // The sample data lists every allergen and diet, so anything not flagged is a known "no".
    is_vegan: false,
    is_vegetarian: false,
    is_gluten_free: false,
    peanut: false,
    tree_nut: false,
    milk: false,
    egg: false,
    soy: false,
    sesame: false,
    fish: false,
    shellfish: false,
    wheat: false,
  }
  for (const f of flags) row[FLAG_COLUMN[f]] = true
  return row
}

/** Sample menu for one hall and meal. Synchronous, for the /?demo history and for running without Supabase. */
export function sampleMenu(hall: Hall, meal: Meal, date = new Date()): MenuRow[] {
  const servedate = dayKey(date)
  const seed = `${hall}|${servedate.replace(/-/g, '')}`
  return DISHES.map((d, i) => [d, i] as const)
    .filter(([d]) => d[2].includes(MEAL_CODE[meal]))
    // Frary keeps the three dishes from the screen flow board so the demo matches it.
    .filter(([d]) => (hall === 'Frary' && ['Chicken shawarma', 'Black bean burger', 'Quinoa salad'].includes(d[0])) || hash(seed + d[0]) % 3 !== 0)
    .map(([d, i]) => sampleRow(d, hall, meal, i, servedate))
}
