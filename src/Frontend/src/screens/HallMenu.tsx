import { useMemo, useState } from 'react'
import { BackTitle, Page, Segmented, SectionLabel } from '../components/app'
import { Chip, PrimaryButton } from '../components/ui'
import { allergensIn, byStation, fitsDiet, getMenu, rowNutrients, type MenuRow } from '../menu'
import { HALLS, homeHall, MEALS, type Hall, type Meal } from '../onboarding'
import { dayKey, newId, type LogEntry, type Profile } from '../store'

export function HallMenu({ profile, meal: startMeal, onBack, onSave }: { profile: Profile; meal: Meal; onBack: () => void; onSave: (e: LogEntry[]) => void }) {
  const [meal, setMeal] = useState<Meal>(startMeal)
  const [hall, setHall] = useState<Hall>(homeHall(profile.college))
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Map<string, { hall: Hall; row: MenuRow }>>(new Map())

  // Mock rows for now (see menu.ts); later this is a query on menu_items_<hall>.
  const rows = useMemo(() => getMenu(hall, meal), [hall, meal])
  const q = query.trim().toLowerCase()
  const shown = rows
    .filter((r) => !q || r.shortName.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    // Dishes that fit the user's diet come first within each station.
    .sort((a, b) => Number(fitsDiet(b, profile.dietary)) - Number(fitsDiet(a, profile.dietary)))
  const groups = byStation(shown)

  const toggle = (row: MenuRow) =>
    setPicked((m) => {
      const next = new Map(m)
      if (next.has(row.itemID)) next.delete(row.itemID)
      else next.set(row.itemID, { hall, row })
      return next
    })

  const save = () =>
    onSave(
      [...picked.values()].map(({ hall, row }) => ({
        id: newId(),
        date: dayKey(),
        meal,
        name: row.shortName,
        hall,
        serving: row.serving ?? undefined,
        nutrients: rowNutrients(row),
        loggedAt: Date.now(),
      })),
    )

  const n = picked.size
  return (
    <Page
      background={profile.background}
      footer={
        n > 0 && (
          <PrimaryButton onClick={save}>
            Add {n} item{n === 1 ? '' : 's'} to {meal}
          </PrimaryButton>
        )
      }
    >
      <BackTitle onBack={onBack}>Add to {meal}</BackTitle>

      <SectionLabel>Meal</SectionLabel>
      <Segmented label="Meal" options={MEALS} value={meal} onChange={setMeal} />

      <SectionLabel>Dining hall</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {HALLS.map((h) => (
          <Chip key={h} selected={h === hall} onClick={() => setHall(h)} className="min-h-10 px-3.5 text-[14px]">
            {h}
          </Chip>
        ))}
      </div>

      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-2xl bg-white px-4">
        <svg className="shrink-0 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#9a9a9a]"
          placeholder={`Search ${hall} ${meal.toLowerCase()} menu`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
        />
      </label>
      <p className="mt-2 text-[13px] text-ink/70">
        Showing today's {meal.toLowerCase()} at {hall}.
      </p>

      <div className="mt-3 space-y-3">
        {groups.length === 0 && <p className="rounded-3xl bg-white/70 p-5 text-center text-[14px] text-muted">{q ? `Nothing matches "${query.trim()}".` : `${hall} isn't serving ${meal.toLowerCase()} today.`}</p>}
        {groups.map(([station, items]) => (
          <div key={station} className="rounded-3xl bg-white px-4 pt-3 pb-1">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">{station}</p>
            <ul className="divide-y divide-line">
              {items.map((row) => {
                const on = picked.has(row.itemID)
                const n = rowNutrients(row)
                const warn = allergensIn(row, profile.allergens)
                return (
                  <li key={row.itemID} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium">{row.shortName}</p>
                      <p className="mt-0.5 text-[12px] text-muted tabular-nums">
                        {n.calories ?? '?'} kcal · P {n.protein ?? '?'}g · C {n.carbs ?? '?'}g · F {n.fat ?? '?'}g
                      </p>
                      {warn.length > 0 && <p className="mt-0.5 text-[12px] font-semibold text-c-red">Contains {warn.join(', ').toLowerCase()}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      aria-pressed={on}
                      aria-label={on ? `Remove ${row.shortName}` : `Add ${row.shortName}`}
                      className={`grid size-10 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${on ? 'border-c-green bg-c-green text-white' : 'border-ink text-ink'}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {on ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 5v14M5 12h14" />}
                      </svg>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </Page>
  )
}
