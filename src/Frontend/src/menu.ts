// Mock dining hall menus, shaped like the scraper's Postgres tables (menu_items_frary, menu_items_collins, ...)
// so swapping in the real database later only changes where rows come from.
//
// Column names match scraper/bonappetit/bonappetit.py and scraper/frank_frary/pomona.py: nutrient values are
// strings (the Bon Appétit tables store TEXT), and allergens and diets are boolean flag columns.

import { HALLS, type Hall, type Meal, type TrackableId } from './onboarding'
import { dayKey, type Nutrients } from './store'

export const FLAG_COLUMNS = ['Vegan', 'Vegetarian', 'Gluten Free', 'Peanut', 'Tree Nut', 'Milk', 'Egg', 'Soy', 'Sesame', 'Fish', 'Shellfish', 'Wheat'] as const
type Flag = (typeof FLAG_COLUMNS)[number]

/** One row of a menu_items_<hall> table. */
export type MenuRow = {
  itemID: string
  location: string
  category: string
  meal: string
  description: string
  shortName: string
  serving: string | null
  'Calories (kcal)': string | null
  'Total Lipid/Fat (g)': string | null
  'Saturated fatty acid (g)': string | null
  'Sodium (mg)': string | null
  'Carbohydrates (g)': string | null
  'Total Dietary Fiber (g)': string | null
  'Total Sugars (g)': string | null
  'Protein (g)': string | null
  servedate: string
} & Partial<Record<Flag, boolean>>

/** Which scraper column holds each nutrient the app tracks. */
const COLUMN_FOR: Record<TrackableId, keyof MenuRow> = {
  calories: 'Calories (kcal)',
  protein: 'Protein (g)',
  carbs: 'Carbohydrates (g)',
  fat: 'Total Lipid/Fat (g)',
  fiber: 'Total Dietary Fiber (g)',
  sugar: 'Total Sugars (g)',
  sodium: 'Sodium (mg)',
  satFat: 'Saturated fatty acid (g)',
}

/** Same rules as scraper/menu_database.py to_number: "<1" is 0, units are stripped, junk is null. */
export function toNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  const s = String(value).replace(/\s/g, '')
  if (s.startsWith('<') || s.startsWith('lessthan')) return 0
  const digits = s.replace(/[^0-9.]/g, '')
  const n = Number.parseFloat(digits)
  return Number.isFinite(n) ? n : null
}

export function rowNutrients(row: MenuRow): Nutrients {
  const out: Nutrients = {}
  for (const [id, col] of Object.entries(COLUMN_FOR) as [TrackableId, keyof MenuRow][]) {
    const n = toNumber(row[col])
    if (n != null) out[id] = n
  }
  return out
}

/** The user's allergen chips (onboarding names) -> scraper flag columns. */
export const ALLERGEN_FLAG: Record<string, Flag> = {
  Milk: 'Milk',
  Eggs: 'Egg',
  Peanuts: 'Peanut',
  'Tree nuts': 'Tree Nut',
  Fish: 'Fish',
  Shellfish: 'Shellfish',
  Wheat: 'Wheat',
  Soy: 'Soy',
  Sesame: 'Sesame',
}

/** Allergens from the user's list that this dish contains. */
export function allergensIn(row: MenuRow, allergens: string[]): string[] {
  return allergens.filter((a) => ALLERGEN_FLAG[a] && row[ALLERGEN_FLAG[a]])
}

/** Whether a dish fits every dietary preference we can check from the flags. */
export function fitsDiet(row: MenuRow, dietary: string[]): boolean {
  return dietary.every((d) => {
    switch (d) {
      case 'Vegan':
        return !!row.Vegan
      case 'Vegetarian':
        return !!(row.Vegetarian || row.Vegan)
      case 'Pescatarian':
        return !!(row.Vegetarian || row.Vegan || row.Fish || row.Shellfish)
      case 'Gluten-free':
        return !!row['Gluten Free']
      case 'Dairy-free':
        return !row.Milk
      default:
        return true // Halal and Kosher aren't in the menu data yet.
    }
  })
}

// ---- Mock data -------------------------------------------------------------

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

const fmt = (n: number) => String(n)

function toRow(dish: Dish, hall: Hall, meal: Meal, i: number, servedate: string): MenuRow {
  const [name, station, , kcal, protein, carbs, fat, fiber, sugar, sodium, satFat, serving, flags] = dish
  const row: MenuRow = {
    itemID: String(100000 + HALLS.indexOf(hall) * 10000 + i * 10 + Object.keys(MEAL_CODE).indexOf(meal)),
    location: `${hall} Dining`,
    category: station,
    meal,
    description: '',
    shortName: name,
    serving,
    'Calories (kcal)': fmt(kcal),
    'Total Lipid/Fat (g)': fmt(fat),
    'Saturated fatty acid (g)': fmt(satFat),
    'Sodium (mg)': fmt(sodium),
    'Carbohydrates (g)': fmt(carbs),
    'Total Dietary Fiber (g)': fmt(fiber),
    'Total Sugars (g)': fmt(sugar),
    'Protein (g)': fmt(protein),
    servedate,
  }
  for (const f of flags) row[f] = true
  return row
}

/** Today's menu for one hall and meal, as rows from that hall's table. */
export function getMenu(hall: Hall, meal: Meal, date = new Date()): MenuRow[] {
  const servedate = dayKey(date).replace(/-/g, '')
  const seed = `${hall}|${servedate}`
  return DISHES.map((d, i) => [d, i] as const)
    .filter(([d]) => d[2].includes(MEAL_CODE[meal]))
    // Frary keeps the three dishes from the screen flow board so the demo matches it.
    .filter(([d]) => (hall === 'Frary' && ['Chicken shawarma', 'Black bean burger', 'Quinoa salad'].includes(d[0])) || hash(seed + d[0]) % 3 !== 0)
    .map(([d, i]) => toRow(d, hall, meal, i, servedate))
}

// Hot food first, sides and sweets last.
const STATION_ORDER = ['Breakfast', 'Grill', 'Mainline', 'Wok', 'Pasta', 'Pizza', 'Deli', 'Soup', 'Vegan', 'Salad bar', 'Bakery']

/** Rows grouped by station, hot stations first; rows keep their order within a station. */
export function byStation(rows: MenuRow[]): [string, MenuRow[]][] {
  const groups = new Map<string, MenuRow[]>()
  for (const r of rows) groups.set(r.category, [...(groups.get(r.category) ?? []), r])
  const rank = (s: string) => (STATION_ORDER.indexOf(s) + STATION_ORDER.length + 1) % (STATION_ORDER.length + 1)
  return [...groups].sort((a, b) => rank(a[0]) - rank(b[0]))
}
