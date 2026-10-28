export type College = 'Pomona' | 'CMC' | 'Scripps' | 'Harvey Mudd' | 'Pitzer'

export const COLLEGES: { name: College; hall: string; domains: string[] }[] = [
  { name: 'Pomona', hall: 'Frary', domains: ['pomona.edu'] },
  { name: 'CMC', hall: 'Collins', domains: ['cmc.edu', 'claremontmckenna.edu'] },
  { name: 'Scripps', hall: 'Malott', domains: ['scrippscollege.edu'] },
  { name: 'Harvey Mudd', hall: 'Hoch-Shanahan', domains: ['hmc.edu'] },
  { name: 'Pitzer', hall: 'McConnell', domains: ['pitzer.edu'] },
]

/** Matches the email's domain (or any subdomain, e.g. g.hmc.edu) to a college. */
export function collegeFromEmail(email: string): College | undefined {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return undefined
  return COLLEGES.find((c) => c.domains.some((d) => domain === d || domain.endsWith(`.${d}`)))?.name
}

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

export const GOALS = ['Eat balanced', 'Build muscle', 'Fuel my sport', 'Lose weight', 'Just track habits'] as const

export const MEALS = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late-night'] as const

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

export const TRACKABLES = [
  { id: 'calories', label: 'Calories', hint: 'kcal' },
  { id: 'protein', label: 'Protein', hint: 'g' },
  { id: 'carbs', label: 'Carbohydrates', hint: 'g' },
  { id: 'fat', label: 'Fats', hint: 'g' },
  { id: 'fiber', label: 'Fiber', hint: 'g' },
  { id: 'sugar', label: 'Sugar', hint: 'g' },
  { id: 'sodium', label: 'Sodium', hint: 'mg' },
  { id: 'satFat', label: 'Saturated fat', hint: 'g' },
  { id: 'cholesterol', label: 'Cholesterol', hint: 'mg' },
] as const

export type TrackableId = (typeof TRACKABLES)[number]['id']

export interface OnboardingData {
  email: string
  password: string
  firstName: string
  college?: College
  background: BackgroundId
  goal?: (typeof GOALS)[number]
  meals: string[]
  dietary: string[]
  allergens: string[]
  otherAllergens: string
  tracking: TrackableId[]
}

export const initialData: OnboardingData = {
  email: '',
  password: '',
  firstName: '',
  background: 'sunrise',
  goal: 'Eat balanced',
  meals: ['Breakfast', 'Lunch', 'Dinner'],
  dietary: [],
  allergens: [],
  otherAllergens: '',
  tracking: ['calories', 'protein', 'carbs', 'fat'],
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
