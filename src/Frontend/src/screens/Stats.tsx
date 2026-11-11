import { useState } from 'react'
import { Card, Flame, fmtNum, Page, Segmented, type Tab } from '../components/app'
import { TRACKABLES } from '../onboarding'
import { addDays, dayKey, streak, sumNutrients, type AppState, type LogEntry } from '../store'

const RANGES = ['Week', 'Month', 'Semester'] as const
type Range = (typeof RANGES)[number]

/** Rough start of the current semester: late August for fall, late January for spring. */
function semesterStart(today: Date): Date {
  const y = today.getFullYear()
  return today.getMonth() >= 7 ? new Date(y, 7, 25) : new Date(y, 0, 20)
}

interface Bar {
  label: string
  kcal: number
  /** Today, or the week in progress: shown grey because it isn't finished. */
  partial: boolean
}

function daysBetween(start: Date, end: Date): Date[] {
  const out: Date[] = []
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= end; d = addDays(d, 1)) out.push(d)
  return out
}

export function Stats({ state, onTab }: { state: AppState; onTab: (t: Tab) => void }) {
  const [range, setRange] = useState<Range>('Week')
  const { profile } = state
  const today = new Date()
  const todayKey = dayKey(today)
  const start = range === 'Week' ? addDays(today, -6) : range === 'Month' ? addDays(today, -29) : semesterStart(today)
  const days = daysBetween(start, today)
  const keys = new Set(days.map(dayKey))
  const logs = state.logs.filter((l) => keys.has(l.date))

  const byDay = new Map<string, LogEntry[]>()
  for (const l of logs) byDay.set(l.date, [...(byDay.get(l.date) ?? []), l])
  const kcalOn = (k: string) => (byDay.get(k) ?? []).reduce((s, l) => s + (l.nutrients.calories ?? 0), 0)

  let bars: Bar[]
  if (range === 'Semester') {
    // One bar per week: average calories over the days you logged.
    bars = []
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7).map(dayKey)
      const logged = week.filter((k) => byDay.has(k))
      bars.push({ label: `${i / 7 + 1}`, kcal: logged.length ? logged.reduce((s, k) => s + kcalOn(k), 0) / logged.length : 0, partial: week.includes(todayKey) })
    }
  } else {
    bars = days.map((d, i) => ({
      label: range === 'Week' ? 'SMTWTFS'[d.getDay()] : i % 5 === 4 || i === days.length - 1 ? String(d.getDate()) : '',
      kcal: kcalOn(dayKey(d)),
      partial: dayKey(d) === todayKey,
    }))
  }

  const goal = profile.goals.calories
  const loggedDays = [...byDay.keys()]
  const finishedDays = loggedDays.filter((k) => k !== todayKey)
  const avgKcal = finishedDays.length ? finishedDays.reduce((s, k) => s + kcalOn(k), 0) / finishedDays.length : 0
  const totals = sumNutrients(logs)
  const avgProtein = loggedDays.length ? totals.protein / loggedDays.length : 0
  const meals = new Set(logs.map((l) => `${l.date}|${l.meal}`)).size
  const expected = profile.usualMeals.length * days.length

  const macroKcal = { protein: totals.protein * 4, carbs: totals.carbs * 4, fat: totals.fat * 9 }
  const macroSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat

  // Count each meal once per place, so three items from Frary at lunch is one Frary visit.
  const visits = new Map<string, number>()
  for (const key of new Set(logs.map((l) => `${l.date}|${l.meal}|${l.hall ?? 'Other'}`))) {
    const place = key.split('|')[2]
    visits.set(place, (visits.get(place) ?? 0) + 1)
  }
  const places = [...visits].sort((a, b) => (a[0] === 'Other' ? 1 : b[0] === 'Other' ? -1 : b[1] - a[1]))
  const maxVisits = Math.max(1, ...visits.values())

  return (
    <Page background={profile.background} tab="stats" onTab={onTab}>
      <div className="flex items-baseline justify-between pt-2">
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Stats</h1>
        <span className="text-[13px] text-ink/70">{range === 'Week' ? 'Last 7 days' : range === 'Month' ? 'Last 30 days' : 'This semester'}</span>
      </div>
      <div className="mt-3">
        <Segmented label="Range" options={RANGES} value={range} onChange={setRange} />
      </div>

      <Card className="mt-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">{range === 'Semester' ? 'Calories per day, by week' : 'Calories per day'}</p>
          {avgKcal > 0 && <p className="text-[13px] text-muted tabular-nums">avg {fmtNum(avgKcal)} kcal</p>}
        </div>
        <CalorieChart bars={bars} goal={goal} showValues={range === 'Week'} />
        <div className="mt-2 flex gap-4 text-[12px] text-muted">
          <Legend color="#30a46c">under goal</Legend>
          <Legend color="#f2803a">over goal</Legend>
          <Legend color="#cfccc6">{range === 'Semester' ? 'this week so far' : 'today so far'}</Legend>
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile label="Streak" value={<><Flame /> {streak(state.logs)}</>} sub="days in a row" />
        <Tile label="Meals logged" value={meals} sub={`of ${expected} meals`} />
        <Tile
          label="Avg protein"
          value={
            <>
              {fmtNum(avgProtein)}
              <span className="text-[14px]">g</span>
            </>
          }
          sub={`goal ${fmtNum(profile.goals.protein)} g`}
        />
      </div>

      <Card className="mt-3">
        <p className="text-[15px] font-semibold">Macro split</p>
        <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-line">
          {macroSum > 0 &&
            (['protein', 'carbs', 'fat'] as const).map((k) => (
              <div key={k} style={{ width: `${(macroKcal[k] / macroSum) * 100}%`, background: TRACKABLES.find((t) => t.id === k)!.color }} />
            ))}
        </div>
        <div className="mt-2 flex justify-between text-[13px]">
          {(['protein', 'carbs', 'fat'] as const).map((k) => {
            const t = TRACKABLES.find((x) => x.id === k)!
            return (
              <Legend key={k} color={t.color}>
                {t.label} <span className="tabular-nums">{macroSum ? Math.round((macroKcal[k] / macroSum) * 100) : 0}%</span>
              </Legend>
            )
          })}
        </div>
      </Card>

      <Card className="mt-3">
        <p className="text-[15px] font-semibold">Where you ate</p>
        {places.length === 0 && <p className="mt-2 text-[14px] text-muted">Log a meal and your dining halls show up here.</p>}
        <ul className="mt-2 space-y-2.5">
          {places.map(([place, n]) => (
            <li key={place} className="flex items-center gap-3 text-[14px]">
              <span className="w-20 shrink-0 truncate">{place}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                <span className="block h-full rounded-full" style={{ width: `${(n / maxVisits) * 100}%`, background: place === 'Other' ? '#f2803a' : '#30a46c' }} />
              </span>
              <span className="w-6 shrink-0 text-right font-semibold tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  )
}

function CalorieChart({ bars, goal, showValues }: { bars: Bar[]; goal: number; showValues: boolean }) {
  const W = 320
  const H = 150
  const top = 16
  const bottom = 18
  const left = 26
  const max = Math.max(goal * 1.2, ...bars.map((b) => b.kcal))
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max)
  const slot = (W - left) / bars.length
  const bw = Math.min(26, slot * 0.68)
  const k = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Calories per day against a ${goal} kcal goal`}>
      {[0, 1000, 2000, 3000].filter((v) => v <= max).map((v) => (
        <g key={v}>
          <line x1={left} x2={W} y1={y(v)} y2={y(v)} stroke="#000" strokeOpacity="0.06" />
          <text x={left - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#8a8a8a">
            {v ? `${v / 1000}k` : '0'}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = left + slot * i + (slot - bw) / 2
        const fill = b.partial ? '#cfccc6' : b.kcal > goal ? '#f2803a' : '#30a46c'
        return (
          <g key={i}>
            {b.kcal > 0 && <rect x={x} y={y(b.kcal)} width={bw} height={y(0) - y(b.kcal)} rx={Math.min(4, bw / 3)} fill={fill} />}
            {showValues && b.kcal > 0 && (
              <text x={x + bw / 2} y={y(b.kcal) - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#444">
                {k(b.kcal)}
              </text>
            )}
            {b.label && (
              <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize="10" fontWeight={b.partial ? 700 : 400} fill={b.partial ? '#111' : '#8a8a8a'}>
                {b.label}
              </text>
            )}
          </g>
        )
      })}
      <line x1={left} x2={W} y1={y(goal)} y2={y(goal)} stroke="#111" strokeWidth="1.2" strokeDasharray="4 3" />
      <text x={left} y={y(goal) - 4} fontSize="9" fontWeight="700" fill="#111">
        goal
      </text>
    </svg>
  )
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1 font-display text-[24px] leading-tight font-extrabold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </div>
  )
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}
