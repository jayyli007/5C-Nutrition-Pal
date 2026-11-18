import { useEffect, useState } from 'react'
import { initialData, TRACKABLES, type Hall, type Meal, type OnboardingData, type TrackableId } from './onboarding'

/** Nutrient amounts for one serving or one day. Missing means the menu didn't list it. */
export type Nutrients = Partial<Record<TrackableId, number>>

export interface LogEntry {
  id: string
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  meal: Meal
  name: string
  /** Dining hall for menu items; undefined for food typed in by hand. */
  hall?: Hall
  /** Free-text "where from" for food typed in by hand. */
  where?: string
  serving?: string
  nutrients: Nutrients
  loggedAt: number
}

/** A food typed in by hand and saved so it can be logged again in one tap. */
export interface MyFood {
  id: string
  name: string
  where?: string
  serving?: string
  nutrients: Nutrients
}

/** The user's settings. The password never leaves the sign-up form. */
export type Profile = Omit<OnboardingData, 'password'>

export interface AppState {
  profile: Profile
  /** True once onboarding is finished or the user logged in. */
  signedIn: boolean
  logs: LogEntry[]
  myFoods: MyFood[]
}

const KEY = '5cfit:v1'

export const emptyState: AppState = {
  profile: withoutPassword(initialData),
  signedIn: false,
  logs: [],
  myFoods: [],
}

export function withoutPassword(data: OnboardingData): Profile {
  const { password: _password, ...profile } = data
  return profile
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState
    const saved = JSON.parse(raw) as Partial<AppState>
    // Merge over defaults so settings added later get a value for older saves.
    return {
      ...emptyState,
      ...saved,
      profile: {
        ...emptyState.profile,
        ...saved.profile,
        goals: { ...emptyState.profile.goals, ...saved.profile?.goals },
      },
    }
  } catch {
    return emptyState
  }
}

/** App state, saved to localStorage on every change so logs survive a refresh. */
export function useAppState() {
  const [state, setState] = useState<AppState>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Private mode or storage full: keep working in memory.
    }
  }, [state])
  return [state, setState] as const
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

export function sumNutrients(entries: { nutrients: Nutrients }[]): Record<TrackableId, number> {
  const total = Object.fromEntries(TRACKABLES.map((t) => [t.id, 0])) as Record<TrackableId, number>
  for (const e of entries) for (const t of TRACKABLES) total[t.id] += e.nutrients[t.id] ?? 0
  return total
}

/** Days in a row with at least one meal logged, counting back from today (or yesterday if today is still empty). */
export function streak(logs: LogEntry[], today = new Date()): number {
  const days = new Set(logs.map((l) => l.date))
  let d = days.has(dayKey(today)) ? today : addDays(today, -1)
  let n = 0
  while (days.has(dayKey(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** The meal you're most likely logging right now. */
export function mealForNow(now = new Date()): Meal {
  const h = now.getHours()
  const weekend = now.getDay() === 0 || now.getDay() === 6
  if (h < 10) return weekend ? 'Brunch' : 'Breakfast'
  if (h < 15) return weekend ? 'Brunch' : 'Lunch'
  return 'Dinner'
}
