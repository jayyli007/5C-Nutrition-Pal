import { useState, type ReactNode } from 'react'
import { Card, fmtNum, Page, Segmented, type Tab } from '../components/app'
import { ALLERGENS, BACKGROUNDS, COLLEGES, DIETARY_RESTRICTIONS, homeHall, MEALS, toggle, TRACKABLES, type TrackableId } from '../onboarding'
import type { AppState, Profile } from '../store'

const VIEWS = ['Me', 'Settings'] as const

export function Me({ state, onTab, update, onLogOut }: { state: AppState; onTab: (t: Tab) => void; update: (p: Partial<Profile>) => void; onLogOut: () => void }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>('Me')
  const { profile } = state
  const name = profile.firstName.trim() || 'You'

  return (
    <Page background={profile.background} tab="me" onTab={onTab}>
      <div className="flex items-center gap-4 pt-3">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-c-yellow font-display text-[26px] font-extrabold">{name[0].toUpperCase()}</div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[30px] leading-tight font-extrabold tracking-tight">{name}</h1>
          <p className="text-[14px] text-ink/70">{profile.college ? `${profile.college} · home hall ${homeHall(profile.college)}` : 'Pick your college in Settings'}</p>
        </div>
      </div>
      <div className="mt-4">
        <Segmented label="Section" options={VIEWS} value={view} onChange={setView} />
      </div>
      <div className="mt-3 space-y-3">{view === 'Me' ? <MeView profile={profile} update={update} /> : <SettingsView state={state} update={update} onLogOut={onLogOut} />}</div>
    </Page>
  )
}

function MeView({ profile, update }: { profile: Profile; update: (p: Partial<Profile>) => void }) {
  const on = (id: TrackableId) => !profile.justMeals && profile.tracking.includes(id)
  // Turned-off nutrients sink to the bottom, as the hint says.
  const rows = [...TRACKABLES].sort((a, b) => Number(on(b.id)) - Number(on(a.id)))
  const otherAllergens = profile.otherAllergens.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <>
      <Card className="p-5">
        <CardTitle sub="Turned-off items leave your rings and move to the bottom. Tap a goal to change it.">What do you want to track?</CardTitle>
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {rows.map((t) => {
            const active = on(t.id)
            return (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span className="size-3 shrink-0 rounded-full" style={{ background: active ? t.color : '#d9d6d0' }} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[16px] font-semibold ${active ? '' : 'text-ink/40'}`}>{t.label}</p>
                  {active ? (
                    <GoalInput value={profile.goals[t.id]} unit={t.short} onChange={(v) => update({ goals: { ...profile.goals, [t.id]: v } })} label={t.label} />
                  ) : (
                    <p className="text-[13px] text-ink/40">Not tracking</p>
                  )}
                </div>
                <Switch
                  checked={active}
                  label={`Track ${t.label}`}
                  onChange={() => {
                    const tracking = toggle(profile.justMeals ? [] : profile.tracking, t.id)
                    update({ tracking, justMeals: tracking.length === 0 })
                  }}
                />
              </li>
            )
          })}
          <li className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">Just log meals, no numbers</p>
              <p className="text-[13px] text-muted">Hides the rings on Today.</p>
            </div>
            <Switch
              checked={profile.justMeals}
              label="Just log meals, no numbers"
              onChange={() => update(profile.justMeals ? { justMeals: false, tracking: profile.tracking.length ? profile.tracking : ['calories'] } : { justMeals: true })}
            />
          </li>
        </ul>
      </Card>

      <Card className="p-5">
        <CardTitle sub="We'll flag dining hall dishes that contain these.">Allergens</CardTitle>
        <PickList
          tone="danger"
          all={ALLERGENS}
          selected={profile.allergens}
          onToggle={(a) => update({ allergens: toggle(profile.allergens, a) })}
          extra={otherAllergens.map((a) => (
            <SelectedChip key={`other-${a}`} tone="danger" onRemove={() => update({ otherAllergens: otherAllergens.filter((x) => x !== a).join(', ') })}>
              {a}
            </SelectedChip>
          ))}
        />
        <AddOther
          placeholder="Something else? e.g. mustard"
          onAdd={(a) => update({ otherAllergens: [...otherAllergens, a].join(', ') })}
        />
      </Card>

      <Card className="p-5">
        <CardTitle sub="Menus show matching dishes first.">Dietary restrictions</CardTitle>
        <PickList all={DIETARY_RESTRICTIONS} selected={profile.dietary} onToggle={(d) => update({ dietary: toggle(profile.dietary, d) })} />
      </Card>

      <Card className="p-5">
        <CardTitle sub="Each one gets its own card on Today.">Usual meals</CardTitle>
        <PickList all={MEALS} selected={profile.usualMeals} onToggle={(m) => update({ usualMeals: MEALS.filter((x) => (x === m ? !profile.usualMeals.includes(m) : profile.usualMeals.includes(x))) })} />
      </Card>
    </>
  )
}

function SettingsView({ state, update, onLogOut }: { state: AppState; update: (p: Partial<Profile>) => void; onLogOut: () => void }) {
  const { profile } = state
  return (
    <>
      <Card className="p-5">
        <CardTitle>Name</CardTitle>
        <input
          className="mt-3 h-12 w-full rounded-xl border border-line bg-white px-4 text-[17px] font-semibold outline-none focus:border-ink"
          autoComplete="given-name"
          value={profile.firstName}
          onChange={(e) => update({ firstName: e.target.value })}
          aria-label="First name"
        />
      </Card>

      <Card className="p-5">
        <CardTitle sub="Your home dining hall shows up first on menus.">College</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLLEGES.map((c) => {
            const sel = profile.college === c.name
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={sel}
                onClick={() => update({ college: c.name })}
                className={`min-h-11 rounded-full border px-4 text-[15px] font-medium ${sel ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>Background</CardTitle>
        <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-3" role="radiogroup" aria-label="Background">
          {BACKGROUNDS.map((b) => {
            const sel = b.id === profile.background
            return (
              <button key={b.id} type="button" role="radio" aria-checked={sel} onClick={() => update({ background: b.id })} className="flex flex-col items-center gap-1">
                <span className={`aspect-square w-full rounded-2xl border ${sel ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-line'}`} style={{ background: b.css }} />
                <span className="text-[12px]">{b.name}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>Account</CardTitle>
        {profile.email && <p className="mt-1 text-[14px] text-muted">{profile.email}</p>}
        <p className="mt-1 text-[13px] text-muted">
          {state.logs.length} {state.logs.length === 1 ? 'item' : 'items'} logged · {state.myFoods.length} in My Foods
        </p>
        <button type="button" onClick={onLogOut} className="mt-4 h-12 w-full rounded-2xl border border-c-red/40 text-[16px] font-semibold text-c-red active:bg-c-red/5">
          Log out
        </button>
      </Card>
    </>
  )
}

function CardTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div>
      <h2 className="text-[19px] font-bold">{children}</h2>
      {sub && <p className="mt-1 text-[14px] leading-snug text-ink/70">{sub}</p>}
    </div>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${checked ? 'border-c-green bg-c-green' : 'border-line bg-[#eeece8]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-6.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
    </button>
  )
}

/** "2,200 kcal a day"; tap to type a new goal. */
function GoalInput({ value, unit, onChange, label }: { value: number; unit: string; onChange: (v: number) => void; label: string }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(String(value))
  if (!editing)
    return (
      <button
        type="button"
        onClick={() => {
          setText(String(value))
          setEditing(true)
        }}
        className="text-[13px] text-ink/70 underline decoration-dotted underline-offset-2"
      >
        {fmtNum(value)} {unit} a day
      </button>
    )
  const commit = () => {
    const n = Math.round(Number(text))
    if (Number.isFinite(n) && n > 0) onChange(n)
    setEditing(false)
  }
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-ink/70">
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        min="1"
        aria-label={`${label} daily goal`}
        className="h-8 w-20 rounded-lg border border-ink px-2 text-[15px] text-ink outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      {unit} a day
    </span>
  )
}

function SelectedChip({ children, onRemove, tone }: { children: ReactNode; onRemove: () => void; tone?: 'danger' }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${children}`}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-semibold ${tone === 'danger' ? 'border-c-red bg-c-red/10 text-ink' : 'border-ink bg-ink text-white'}`}
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  )
}

/** Picked items as removable chips, then "Tap to add" dashed chips for the rest. */
function PickList({ all, selected, onToggle, tone, extra }: { all: readonly string[]; selected: string[]; onToggle: (v: string) => void; tone?: 'danger'; extra?: ReactNode }) {
  const rest = all.filter((a) => !selected.includes(a))
  return (
    <>
      {(selected.length > 0 || extra) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {all
            .filter((a) => selected.includes(a))
            .map((a) => (
              <SelectedChip key={a} tone={tone} onRemove={() => onToggle(a)}>
                {a}
              </SelectedChip>
            ))}
          {extra}
        </div>
      )}
      {rest.length > 0 && (
        <>
          <p className="mt-4 mb-2 text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">Tap to add</p>
          <div className="flex flex-wrap gap-2">
            {rest.map((a) => (
              <button key={a} type="button" onClick={() => onToggle(a)} className="min-h-11 rounded-full border-2 border-dashed border-[#d3d0c9] bg-[#f4f2ee] px-4 text-[15px] text-ink/60">
                {a}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function AddOther({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [text, setText] = useState('')
  const add = () => {
    if (text.trim()) onAdd(text.trim())
    setText('')
  }
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <input className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none placeholder:text-[#a3a3a3] focus:border-ink" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" disabled={!text.trim()} className="h-11 rounded-xl bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-30">
        Add
      </button>
    </form>
  )
}
