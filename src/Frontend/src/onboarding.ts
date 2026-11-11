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
  { id: 'calories', label: 'Calories', unit: 'kcal', color: '#f2803a' },
  { id: 'protein', label: 'Protein', unit: 'grams', color: '#e5484d' },
  { id: 'carbs', label: 'Carbs', unit: 'grams', color: '#f5c518' },
  { id: 'fat', label: 'Fat', unit: 'grams', color: '#30a46c' },
  { id: 'fiber', label: 'Fiber', unit: 'grams', color: '#3b82f6' },
  { id: 'sugar', label: 'Sugar', unit: 'grams', color: '#c86fd8' },
  { id: 'sodium', label: 'Sodium', unit: 'milligrams', color: '#8b8d98' },
  { id: 'satFat', label: 'Saturated fat', unit: 'grams', color: '#12a594' },
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
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
