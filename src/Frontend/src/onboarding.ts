export type College = 'Pomona' | 'CMC' | 'Scripps' | 'Harvey Mudd' | 'Pitzer'

export const HALLS = ['Frary', 'Frank', 'Oldenborg', 'Collins', 'Malott', 'Hoch', 'McConnell'] as const
export type Hall = (typeof HALLS)[number]

/** Each college's home dining hall, shown first on menus. */
export const COLLEGES: { name: College; hall: Hall }[] = [
  { name: 'Pomona', hall: 'Frary' },
  { name: 'CMC', hall: 'Collins' },
  { name: 'Scripps', hall: 'Malott' },
  { name: 'Harvey Mudd', hall: 'Hoch' },
  { name: 'Pitzer', hall: 'McConnell' },
]

export function homeHall(college?: College): Hall {
  return COLLEGES.find((c) => c.name === college)?.hall ?? 'Frary'
}

/** Loose check: something@something.tld. Any provider works. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export const MEALS = ['Breakfast', 'Brunch', 'Lunch', 'Dinner'] as const
export type Meal = (typeof MEALS)[number]

export const BACKGROUNDS = [
  { id: 'sunrise', name: 'Sunrise', css: 'linear-gradient(180deg, #fde68a 0%, #fbb4a5 55%, #f9a8d4 100%)' },
  { id: 'lagoon', name: 'Lagoon', css: 'linear-gradient(180deg, #a7f3d0 0%, #99f6e4 50%, #bae6fd 100%)' },
  { id: 'dusk', name: 'Dusk', css: 'linear-gradient(180deg, #fed7aa 0%, #e9d5ff 55%, #c4b5fd 100%)' },
  { id: 'berry', name: 'Berry', css: 'linear-gradient(180deg, #fecdd3 0%, #fbcfe8 100%)' },
  { id: 'sky', name: 'Sky', css: 'linear-gradient(180deg, #bfdbfe 0%, #ddd6fe 100%)' },
  { id: 'citrus', name: 'Citrus', css: 'linear-gradient(180deg, #fde68a 0%, #d9f99d 100%)' },
  { id: 'plain', name: 'Plain', css: '#f7f6f3' },
] as const

export type BackgroundId = (typeof BACKGROUNDS)[number]['id']

export const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Halal',
  'Kosher',
  'Gluten-free',
  'Dairy-free',
] as const

// The FDA "major food allergens", which is also how the dining hall menus label items.
export const ALLERGENS = ['Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Fish', 'Shellfish', 'Wheat', 'Soy', 'Sesame'] as const

// Colors follow the screen flow board: calories yellow, protein red, carbs orange, fat blue.
// `short` is the unit shown next to numbers; `goal` is the starting daily goal (editable in Me).
export const TRACKABLES = [
  { id: 'calories', label: 'Calories', unit: 'kcal', short: 'kcal', goal: 2200, color: '#f5c518' },
  { id: 'protein', label: 'Protein', unit: 'grams', short: 'g', goal: 120, color: '#e5484d' },
  { id: 'carbs', label: 'Carbs', unit: 'grams', short: 'g', goal: 250, color: '#f2803a' },
  { id: 'fat', label: 'Fat', unit: 'grams', short: 'g', goal: 70, color: '#3b82f6' },
  { id: 'fiber', label: 'Fiber', unit: 'grams', short: 'g', goal: 30, color: '#30a46c' },
  { id: 'sugar', label: 'Sugar', unit: 'grams', short: 'g', goal: 50, color: '#c86fd8' },
  { id: 'sodium', label: 'Sodium', unit: 'milligrams', short: 'mg', goal: 2300, color: '#8b8d98' },
  { id: 'satFat', label: 'Saturated fat', unit: 'grams', short: 'g', goal: 20, color: '#12a594' },
] as const

export type TrackableId = (typeof TRACKABLES)[number]['id']

export interface OnboardingData {
  email: string
  password: string
  firstName: string
  college?: College
  background: BackgroundId
  dietary: string[]
  allergens: string[]
  otherAllergens: string
  tracking: TrackableId[]
  /** "Just log meals, no numbers": overrides tracking. */
  justMeals: boolean
  /** Daily goal per nutrient, edited in Me. */
  goals: Record<TrackableId, number>
  /** Meals that get their own card on Today. */
  usualMeals: Meal[]
}

export const initialData: OnboardingData = {
  email: '',
  password: '',
  firstName: '',
  background: 'sunrise',
  dietary: [],
  allergens: [],
  otherAllergens: '',
  tracking: ['calories', 'protein', 'carbs', 'fat'],
  justMeals: false,
  goals: Object.fromEntries(TRACKABLES.map((t) => [t.id, t.goal])) as Record<TrackableId, number>,
  usualMeals: ['Breakfast', 'Lunch', 'Dinner'],
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
