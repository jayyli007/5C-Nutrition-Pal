import { useMemo, useState } from 'react'
import { Card, Check, Flame, fmtNum, NutrientRings, Page, type Tab } from '../components/app'
import { allergensIn, fitsDiet, getMenu, rowNutrients, type MenuRow } from '../menu'
import { HALLS, MEALS, TRACKABLES, type Hall, type Meal } from '../onboarding'
import { dayKey, newId, streak, sumNutrients, type AppState, type LogEntry } from '../store'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Best dinner pick across the halls: safe for the user's allergens and diet, fits what's left of the calorie goal, most protein per calorie. */
function tonightPick(state: AppState, eatenKcal: number): { hall: Hall; row: MenuRow } | undefined {
  const { profile } = state
  const budget = Math.max(350, profile.goals.calories - eatenKcal)
  let best: { hall: Hall; row: MenuRow; score: number } | undefined
  for (const hall of HALLS) {
    for (const row of getMenu(hall, 'Dinner')) {
      const n = rowNutrients(row)
      const kcal = n.calories ?? 0
      if (kcal < 250 || kcal > budget) continue
      if (allergensIn(row, profile.allergens).length || !fitsDiet(row, profile.dietary)) continue
      const score = (n.protein ?? 0) / kcal
      if (!best || score > best.score) best = { hall, row, score }
    }
  }
  return best
}

export function Today({
  state,
  onTab,
  onLog,
  addLogs,
  removeLog,
}: {
  state: AppState
  onTab: (t: Tab) => void
  onLog: (meal?: Meal) => void
  addLogs: (e: LogEntry[]) => void
  removeLog: (id: string) => void
}) {
  const { profile } = state
  const today = dayKey()
  const todays = state.logs.filter((l) => l.date === today)
  const totals = sumNutrients(todays)
  const tracked = profile.justMeals ? [] : TRACKABLES.filter((t) => profile.tracking.includes(t.id))
  const days = streak(state.logs)
  const [open, setOpen] = useState<Meal | null>(null)

  // One card per usual meal, plus any other meal already logged today.
  const cardMeals = MEALS.filter((m) => profile.usualMeals.includes(m) || todays.some((l) => l.meal === m))
  const dinnerLogged = todays.some((l) => l.meal === 'Dinner')
  const pick = useMemo(() => (dinnerLogged ? undefined : tonightPick(state, totals.calories)), [state, dinnerLogged, totals.calories])

  return (
    <Page background={profile.background} tab="today" onTab={onTab}>
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-[14px] text-ink/70">{WEEKDAYS[new Date().getDay()]}</p>
          <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-tight">What's on your plate?</h1>
        </div>
        <div className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-ink py-2 pr-4 pl-3 text-white" aria-label={`${days}-day streak`}>
          <Flame />
          <span className="font-display text-[20px] font-extrabold">{days}</span>
          <span className="text-[12px] leading-tight font-semibold">
            -day
            <br />
            streak
          </span>
        </div>
      </div>

      {tracked.length > 0 ? (
        <div className="mt-5 flex items-center gap-4">
          <NutrientRings ids={tracked.map((t) => t.id)} totals={totals} goals={profile.goals} size={tracked.length > 4 ? 176 : 164} />
          <ul className="min-w-0 flex-1 space-y-2">
            {tracked.map((t, i) => (
              <li key={t.id} className="flex gap-2">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
                <div className="leading-tight">
                  <p className="text-[13px] font-semibold">{t.label}</p>
                  {i === 0 && tracked.length <= 4 ? (
                    <>
                      <p className="font-display text-[22px] font-extrabold tabular-nums">{fmtNum(totals[t.id])}</p>
                      <p className="text-[12px] text-ink/70 tabular-nums">
                        of {fmtNum(profile.goals[t.id])} {t.short}
                      </p>
                    </>
                  ) : (
                    <p className="text-[12px] text-ink/70 tabular-nums">
                      {fmtNum(totals[t.id])} / {fmtNum(profile.goals[t.id])} {t.short}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Card className="mt-5 text-center">
          <p className="font-display text-[40px] font-extrabold">{new Set(todays.map((l) => l.meal)).size}</p>
          <p className="text-[14px] text-muted">meals logged today</p>
        </Card>
      )}

      <div className="mt-5 flex justify-center">
        <button type="button" onClick={() => onLog()} className="flex h-14 items-center gap-3 rounded-full bg-ink pr-7 pl-3 text-[18px] font-semibold text-white shadow-lg transition active:scale-[0.98]">
          <span className="grid size-9 place-items-center rounded-full bg-c-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          Log a meal
        </button>
      </div>

      <div className={`mt-5 grid gap-2.5 ${cardMeals.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {cardMeals.map((meal) => {
          const items = todays.filter((l) => l.meal === meal)
          if (!items.length)
            return (
              <button key={meal} type="button" onClick={() => onLog(meal)} className="rounded-2xl border-2 border-dashed border-ink/20 bg-white/40 p-3 text-left">
                <p className="text-[15px] font-semibold">{meal}</p>
                <p className="mt-1 text-[13px] text-ink/60">Not yet</p>
                <p className="mt-1 text-[15px] font-semibold text-c-blue">+ Add</p>
              </button>
            )
          const places = [...new Set(items.map((l) => l.hall ?? l.where ?? 'Other'))]
          const kcal = items.reduce((s, l) => s + (l.nutrients.calories ?? 0), 0)
          return (
            <button
              key={meal}
              type="button"
              onClick={() => setOpen(open === meal ? null : meal)}
              aria-expanded={open === meal}
              className={`rounded-2xl bg-white p-3 text-left transition ${open === meal ? 'ring-2 ring-ink' : ''}`}
            >
              <div className="flex items-center justify-between gap-0.5">
                <p className="truncate text-[14px] font-semibold tracking-tight">{meal}</p>
                <Check className="size-4.5" />
              </div>
              <p className="mt-1 truncate text-[13px] text-ink/60">{places.join(', ')}</p>
              <p className="mt-1 font-display text-[19px] font-extrabold tabular-nums">
                {fmtNum(kcal)} <span className="font-sans text-[11px] font-medium text-muted">kcal</span>
              </p>
            </button>
          )
        })}
      </div>

      {open && (
        <Card className="mt-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold">{open}</p>
            <button type="button" onClick={() => onLog(open)} className="text-[14px] font-semibold text-c-blue">
              + Add more
            </button>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {todays
              .filter((l) => l.meal === open)
              .map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{l.name}</p>
                    <p className="text-[12px] text-muted">
                      {[l.hall ?? l.where, l.serving, l.nutrients.calories != null && `${fmtNum(l.nutrients.calories)} kcal`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeLog(l.id)} aria-label={`Remove ${l.name}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-black/5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {pick && (
        <div className="mt-3 flex items-center gap-3 rounded-3xl bg-ink p-4 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-white/70 uppercase">Tonight at {pick.hall}</p>
            <p className="mt-0.5 text-[17px] font-semibold">{pick.row.shortName}</p>
            <p className="mt-0.5 text-[13px] text-white/80">
              {pick.row['Calories (kcal)']} kcal · {pick.row['Protein (g)']}g protein · fits your goal
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              addLogs([
                {
                  id: newId(),
                  date: today,
                  meal: 'Dinner',
                  name: pick.row.shortName,
                  hall: pick.hall,
                  serving: pick.row.serving ?? undefined,
                  nutrients: rowNutrients(pick.row),
                  loggedAt: Date.now(),
                },
              ])
            }
            className="h-11 shrink-0 rounded-full bg-white px-5 text-[15px] font-semibold text-ink active:scale-95"
          >
            Log it
          </button>
        </div>
      )}
    </Page>
  )
}
