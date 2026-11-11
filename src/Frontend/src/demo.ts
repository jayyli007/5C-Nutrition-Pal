// Sample history for previewing the app (open /?demo). Replaces any logs already saved.

import { getMenu, rowNutrients } from './menu'
import { HALLS, homeHall, type Hall, type Meal } from './onboarding'
import { addDays, dayKey, mealForNow, newId, type AppState, type LogEntry } from './store'

export function seedDemo(state: AppState): AppState {
  const profile = state.profile.firstName.trim() ? state.profile : { ...state.profile, firstName: 'Sonia', college: 'Pomona' as const }
  const home = homeHall(profile.college)
  const today = new Date()
  const logs: LogEntry[] = []
  let r = 7
  const rand = () => {
    r = (r * 9301 + 49297) % 233280
    return r / 233280
  }
  const meals: Meal[] = ['Breakfast', 'Lunch', 'Dinner']
  const nowIndex = meals.indexOf(mealForNow(today) === 'Brunch' ? 'Lunch' : mealForNow(today))
  for (let back = 20; back >= 0; back--) {
    const date = addDays(today, -back)
    if (back === 9) continue // one missed day so the streak isn't the whole history
    meals.forEach((meal, mi) => {
      if (back === 0 && mi >= nowIndex) return // today: only meals already eaten
      if (rand() < 0.1) return
      if (rand() < 0.1) {
        logs.push({ id: newId(), date: dayKey(date), meal, name: 'Boba milk tea', where: 'Village', serving: '1 large cup', nutrients: { calories: 350, protein: 4, carbs: 62, fat: 10 }, loggedAt: date.getTime() })
        return
      }
      const hall: Hall = rand() < 0.5 ? home : HALLS[Math.floor(rand() * HALLS.length)]
      const menu = getMenu(hall, meal, date)
      const count = meal === 'Breakfast' ? 2 : 2 + Math.floor(rand() * 2)
      for (let i = 0; i < count && menu.length; i++) {
        const row = menu[Math.floor(rand() * menu.length)]
        logs.push({ id: newId(), date: dayKey(date), meal, name: row.shortName, hall, serving: row.serving ?? undefined, nutrients: rowNutrients(row), loggedAt: date.getTime() })
      }
    })
  }
  return { ...state, profile, signedIn: true, logs }
}
