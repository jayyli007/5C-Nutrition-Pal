import { useState } from 'react'
import { BackTitle, fmtNum, Page, Segmented } from '../components/app'
import { PrimaryButton } from '../components/ui'
import { MEALS, TRACKABLES, type BackgroundId, type Meal } from '../onboarding'
import { dayKey, newId, type LogEntry, type MyFood } from '../store'

const input = 'h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] outline-none placeholder:text-[#a3a3a3] focus:border-ink focus:ring-1 focus:ring-ink'
const color = (id: string) => TRACKABLES.find((t) => t.id === id)!.color

type Macro = 'calories' | 'protein' | 'carbs' | 'fat'
const FIELDS: { id: Macro; label: string }[] = [
  { id: 'calories', label: 'Calories' },
  { id: 'protein', label: 'Protein (g)' },
  { id: 'carbs', label: 'Carbs (g)' },
  { id: 'fat', label: 'Fat (g)' },
]

export function OwnFood({
  background,
  meal: startMeal,
  myFoods,
  onBack,
  onSave,
}: {
  background: BackgroundId
  meal: Meal
  myFoods: MyFood[]
  onBack: () => void
  onSave: (entry: LogEntry, saveAs?: MyFood) => void
}) {
  const [meal, setMeal] = useState<Meal>(startMeal)
  const [name, setName] = useState('')
  const [where, setWhere] = useState('')
  const [serving, setServing] = useState('')
  const [vals, setVals] = useState<Record<Macro, string>>({ calories: '', protein: '', carbs: '', fat: '' })
  const [remember, setRemember] = useState(true)

  const num = (k: Macro) => (vals[k].trim() === '' ? undefined : Math.max(0, Number(vals[k])))
  const kcal = num('calories')
  const p = num('protein') ?? 0
  const c = num('carbs') ?? 0
  const f = num('fat') ?? 0
  const fromMacros = p * 4 + c * 4 + f * 9
  const hasMacros = fromMacros > 0
  const matches = kcal != null && hasMacros && Math.abs(fromMacros - kcal) <= Math.max(25, kcal * 0.15)
  const valid = name.trim() !== '' && kcal != null && Number.isFinite(kcal)

  const fill = (food: MyFood) => {
    setName(food.name)
    setWhere(food.where ?? '')
    setServing(food.serving ?? '')
    setVals({
      calories: food.nutrients.calories?.toString() ?? '',
      protein: food.nutrients.protein?.toString() ?? '',
      carbs: food.nutrients.carbs?.toString() ?? '',
      fat: food.nutrients.fat?.toString() ?? '',
    })
  }

  const save = () => {
    const nutrients = Object.fromEntries(FIELDS.map(({ id }) => [id, num(id)]).filter(([, v]) => v != null && Number.isFinite(v)))
    const base = { name: name.trim(), where: where.trim() || undefined, serving: serving.trim() || undefined, nutrients }
    onSave({ ...base, id: newId(), date: dayKey(), meal, loggedAt: Date.now() }, remember ? { ...base, id: newId() } : undefined)
  }

  return (
    <Page
      background={background}
      footer={
        <PrimaryButton disabled={!valid} onClick={save}>
          Add to {meal}
        </PrimaryButton>
      }
    >
      <BackTitle onBack={onBack}>Add your own food</BackTitle>
      <div className="mt-4">
        <Segmented label="Meal" options={MEALS} value={meal} onChange={setMeal} />
      </div>

      {myFoods.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[14px] font-semibold">My Foods</p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {myFoods.map((food) => (
              <button key={food.id} type="button" onClick={() => fill(food)} className="shrink-0 rounded-full border border-line bg-white px-3.5 py-2 text-[14px] font-medium">
                {food.name}
                {food.nutrients.calories != null && <span className="ml-1.5 text-muted">{fmtNum(food.nutrients.calories)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[14px] font-semibold">What did you eat?</span>
        <input className={input} placeholder="Boba milk tea" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">
            Where from? <span className="font-normal text-muted">(optional)</span>
          </span>
          <input className={input} placeholder="Village, the Coop..." value={where} onChange={(e) => setWhere(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">Serving</span>
          <input className={input} placeholder="1 large cup" value={serving} onChange={(e) => setServing(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 rounded-3xl bg-white/80 p-4">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">Nutrition (per serving)</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-3">
          {FIELDS.map(({ id, label }) => (
            <label key={id} className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
                <span className="size-2 rounded-full" style={{ background: color(id) }} />
                {label}
              </span>
              <input
                className={input}
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={vals[id]}
                onChange={(e) => setVals((v) => ({ ...v, [id]: e.target.value }))}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
          {hasMacros &&
            (['protein', 'carbs', 'fat'] as const).map((k) => {
              const share = ((k === 'fat' ? f * 9 : (k === 'protein' ? p : c) * 4) / fromMacros) * 100
              return <div key={k} style={{ width: `${share}%`, background: color(k) }} />
            })}
        </div>
        <p className={`mt-2 flex items-start gap-1.5 text-[13px] ${!hasMacros || kcal == null ? 'text-muted' : matches ? 'text-c-green' : 'text-c-orange'}`}>
          {hasMacros && kcal != null && (
            <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {matches ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 7v6M12 17v.5" />}
            </svg>
          )}
          <span>
            {!hasMacros
              ? 'Add protein, carbs and fat to check them against calories.'
              : kcal == null
                ? `Macros add up to about ${fmtNum(fromMacros)} kcal.`
                : matches
                  ? `Macros add up to about ${fmtNum(fromMacros)} kcal, which matches.`
                  : `Macros add up to about ${fmtNum(fromMacros)} kcal, not ${fmtNum(kcal)}. Worth a double-check.`}
            {hasMacros && kcal == null && (
              <button type="button" onClick={() => setVals((v) => ({ ...v, calories: String(Math.round(fromMacros)) }))} className="ml-1 font-semibold text-c-blue">
                Use that
              </button>
            )}
          </span>
        </p>
      </div>

      <label className="mt-4 flex items-start gap-3 px-1">
        <input type="checkbox" className="peer sr-only" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 border-ink/30 bg-white text-white peer-checked:border-c-green peer-checked:bg-c-green peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className="text-[14px]">Save to My Foods so I can log it again in one tap</span>
      </label>
    </Page>
  )
}
