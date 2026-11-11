import { useEffect, useState } from 'react'
import { Screen } from './components/ui'
import { BACKGROUNDS, TRACKABLES, initialData, type OnboardingData } from './onboarding'
import { Background } from './screens/Background'
import { DietAllergens } from './screens/DietAllergens'
import { NameCollege } from './screens/NameCollege'
import { SignUp } from './screens/SignUp'
import { Tracking } from './screens/Tracking'

// Steps after sign-up, in order; the progress bar counts these.
const STEPS = [NameCollege, Background, Tracking, DietAllergens]

export default function App() {
  const [data, setData] = useState<OnboardingData>(initialData)
  // 0 = sign up, 1..STEPS.length = onboarding steps, past that = done
  const [index, setIndex] = useState(0)
  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }))
  const next = () => setIndex((i) => i + 1)
  const back = () => setIndex((i) => Math.max(0, i - 1))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  if (index === 0) return <SignUp data={data} update={update} onNext={next} />

  const Step = STEPS[index - 1]
  if (Step) return <Step data={data} update={update} onNext={next} onBack={back} step={index} total={STEPS.length} />

  return <Done data={data} onRestart={() => setIndex(1)} />
}

/** One ring per tracked nutrient, as they'll appear on Today. Fill amounts are placeholders. */
function Rings({ colors }: { colors: string[] }) {
  const width = Math.max(4, Math.min(9, 40 / colors.length))
  return (
    <svg viewBox="0 0 100 100" className="size-44" aria-hidden="true">
      {colors.map((color, i) => {
        const r = 45 - width / 2 - i * (width + 2)
        const c = 2 * Math.PI * r
        const pct = [0.72, 0.55, 0.85, 0.4, 0.65, 0.5, 0.78, 0.35][i % 8]
        return (
          <g key={color} transform="rotate(-90 50 50)">
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth={width} />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
          </g>
        )
      })}
    </svg>
  )
}

/** Placeholder landing after onboarding until the Today screen exists. */
function Done({ data, onRestart }: { data: OnboardingData; onRestart: () => void }) {
  const bg = BACKGROUNDS.find((b) => b.id === data.background)!.css
  const tracked = data.justMeals ? [] : TRACKABLES.filter((t) => data.tracking.includes(t.id))
  const avoid = [...data.allergens.map((a) => `No ${a.toLowerCase()}`), data.otherAllergens.trim(), ...data.dietary].filter(Boolean)
  return (
    <div className="min-h-dvh" style={{ background: bg }}>
      <Screen>
        <h1 className="mt-10 font-display text-[34px] leading-tight font-extrabold tracking-tight">You're all set, {data.firstName.trim()}!</h1>
        <p className="mt-2 text-[15px] text-ink/70">Here's how we'll set up 5C Fit for you.</p>
        {tracked.length > 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl bg-white/85 p-5 backdrop-blur">
            <Rings colors={tracked.map((t) => t.color)} />
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px]">
              {tracked.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        <dl className="mt-3 space-y-3">
          {[
            ['College', data.college],
            ['Tracking', data.justMeals ? 'Just meals, no numbers' : tracked.map((t) => t.label).join(', ')],
            ['Watching for', avoid.length ? avoid.join(', ') : 'Nothing'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/85 p-4 backdrop-blur">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[16px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onRestart} className="mt-6 text-[15px] font-medium text-c-blue">
          Edit answers
        </button>
      </Screen>
    </div>
  )
}
